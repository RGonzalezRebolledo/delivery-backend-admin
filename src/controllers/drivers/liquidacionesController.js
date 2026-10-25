import { pool } from "../../db.js";
import { sendTelegramNotification } from "../../services/telegramService.js"; 

// 1. Obtener pagos pendientes agrupados/resumidos por repartidor (con filtro de fecha opcional)
export const getPagosPendientes = async (req, res) => {
  try {
    const { hasta } = req.query; // Captura la fecha límite enviada desde el frontend

    let query = `
      SELECT 
        u.id AS repartidor_id,
        COALESCE(r.codigo_conductor, u.codigo_conductor, 'N/A') AS codigo_conductor,
        u.nombre,
        COALESCE(r.documento_identidad, 'N/A') AS cedula,
        COALESCE(u.telefono, 'N/A') AS telefono,
        COALESCE(r.codigo_banco, 'N/A') AS banco,
        COALESCE(r.numero_cuenta, 'N/A') AS numero_cuenta,
        COUNT(l.id)::int AS total_pedidos_pendientes,
        COALESCE(SUM(l.monto_repartidor_usd), 0)::numeric AS total_usd,
        COALESCE(SUM(l.monto_repartidor), 0)::numeric AS total_bs_original,
        ARRAY_AGG(l.id) AS liquidacion_ids
      FROM liquidaciones_repartidores l
      JOIN usuarios u ON l.repartidor_id = u.id
      LEFT JOIN repartidores r ON u.id = r.usuario_id
      WHERE l.estado_pago_repartidor = 'pendiente'
    `;

    const queryParams = [];

    // Filtramos usando fecha_proceso que es el campo temporal de la liquidación
    if (hasta) {
      queryParams.push(hasta);
      query += ` AND DATE(l.fecha_proceso) <= $${queryParams.length} `; 
    }

    query += `
      GROUP BY 
        u.id, 
        r.codigo_conductor, 
        u.codigo_conductor, 
        u.nombre, 
        r.documento_identidad, 
        u.telefono, 
        r.codigo_banco, 
        r.numero_cuenta
      ORDER BY u.nombre ASC;
    `;

    const { rows } = await pool.query(query, queryParams);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error en getPagosPendientes:", error);
    return res.status(500).json({ 
      error: "Error interno al consultar liquidaciones pendientes",
      details: error.message 
    });
  }
};

// 🆕 Obtener pagos que están Bloqueados / En Proceso ('procesando')
export const getPagosEnProceso = async (req, res) => {
  try {
    const query = `
      SELECT 
        l.numero_lote,
        MAX(l.numero_referencia_pago) AS numero_referencia,
        MAX(l.tasa_pago_bs) AS tasa_pago_bs,
        MIN(l.fecha_pago) AS fecha_bloqueo,
        COUNT(DISTINCT l.repartidor_id)::int AS total_repartidores,
        COUNT(l.id)::int AS total_pedidos,
        COALESCE(SUM(l.monto_repartidor_usd), 0)::numeric AS total_usd,
        ARRAY_AGG(l.id) AS liquidacion_ids
      FROM liquidaciones_repartidores l
      WHERE l.estado_pago_repartidor = 'procesando'
      GROUP BY l.numero_lote
      ORDER BY fecha_bloqueo DESC;
    `;
    const { rows } = await pool.query(query);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error en getPagosEnProceso:", error);
    return res
      .status(500)
      .json({
        error: "Error interno al consultar pagos en proceso",
        details: error.message,
      });
  }
};

// Helper para generar el número de lote automático
const generarCodigoLote = () => {
  const fecha = new Date();
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const dd = String(fecha.getDate()).padStart(2, "0");
  const aleatorio = Math.floor(1000 + Math.random() * 9000);
  return `LOT-${yyyy}${mm}${dd}-${aleatorio}`;
};

// 2. Procesar pago masivo -> Actualizado para actuar como el paso intermedio (bloquea y pasa a 'procesando')
export const procesarPagoMasivo = async (req, res) => {
  const client = await pool.connect();
  try {
    const { liquidacionIds, numeroReferencia, tasaPagoBs } = req.body;

    if (
      !liquidacionIds ||
      !Array.isArray(liquidacionIds) ||
      liquidacionIds.length === 0
    ) {
      return res
        .status(400)
        .json({
          error: "Debe seleccionar al menos una liquidación para pagar.",
        });
    }
    if (!numeroReferencia || !tasaPagoBs) {
      return res
        .status(400)
        .json({ error: "La referencia y la tasa de pago son obligatorias." });
    }

    // 🎯 Generar el número de lote automático
    const codigoLote = generarCodigoLote();

    await client.query("BEGIN");

    // 🎯 Consulta UPDATE guardando en estado 'procesando' (bloqueo intermedio)
    const updateQuery = `
      UPDATE liquidaciones_repartidores
      SET 
        estado_pago_repartidor = 'procesando',
        fecha_pago = CURRENT_TIMESTAMP,
        tasa_pago_bs = $1,
        numero_referencia_pago = $2,
        numero_lote = $3
      WHERE id = ANY($4::int[]) AND estado_pago_repartidor = 'pendiente'
      RETURNING id;
    `;

    const { rows } = await client.query(updateQuery, [
      tasaPagoBs,
      numeroReferencia,
      codigoLote,
      liquidacionIds,
    ]);

    await client.query("COMMIT");

    return res.status(200).json({
      message:
        "Lote bloqueado exitosamente en espera de liquidación definitiva",
      lote: codigoLote,
      procesados: rows.length,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error procesando pago masivo (bloqueo):", error);
    return res.status(500).json({
      error: "Error al procesar la liquidación",
      details: error.message,
    });
  } finally {
    client.release();
  }
};

// 🆕 2.1 Confirmar definitivo el pago del lote (Pasa de 'procesando' a 'pagado' y dispara Telegram)
export const confirmarPagoLote = async (req, res) => {
  const client = await pool.connect();
  try {
    const { numeroLote } = req.body;

    if (!numeroLote) {
      return res.status(400).json({ error: "Número de lote requerido." });
    }

    await client.query("BEGIN");

    const updateQuery = `
      UPDATE liquidaciones_repartidores
      SET estado_pago_repartidor = 'pagado'
      WHERE numero_lote = $1 AND estado_pago_repartidor = 'procesando'
      RETURNING id, repartidor_id, monto_repartidor_usd, tasa_pago_bs, numero_referencia_pago;
    `;

    const { rows } = await client.query(updateQuery, [numeroLote]);

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({
          error: "No se encontraron registros en proceso para este lote.",
        });
    }

    await client.query("COMMIT");

    // --- NOTIFICACIÓN TELEGRAM ---
    try {
      const liquidacionIds = rows.map((r) => r.id);
      const tasaPagoBs = rows[0].tasa_pago_bs;
      const numeroReferencia = rows[0].numero_referencia_pago;

      const datosNotificacionQuery = `
        SELECT 
          u.nombre,
          r.telegram_chat_id,
          COUNT(l.id) AS total_servicios,
          COALESCE(SUM(l.monto_repartidor_usd), 0) AS total_usd
        FROM liquidaciones_repartidores l
        JOIN usuarios u ON l.repartidor_id = u.id
        LEFT JOIN repartidores r ON u.id = r.usuario_id
        WHERE l.id = ANY($1::int[])
        GROUP BY u.nombre, r.telegram_chat_id;
      `;

      const notifRes = await pool.query(datosNotificacionQuery, [
        liquidacionIds,
      ]);

      for (const item of notifRes.rows) {
        if (item.telegram_chat_id) {
          const totalUsd = Number(item.total_usd);
          const totalBsLiquidado = totalUsd * Number(tasaPagoBs);

          const mensajeTelegram = `
<b>🎉 ¡LIQUIDACIÓN PROCESADA! 💵✨</b>
───────────────────────
Hola <b>${
            item.nombre
          }</b>, se ha registrado exitosamente el pago de tu liquidación.

📦 <b>Nro. Lote Liquidación:</b> <code>${numeroLote}</code>
📋 <b>Servicios liquidados:</b> ${item.total_servicios}
💰 <b>Monto en USD:</b> $${totalUsd.toFixed(2)}
🇻🇪 <b>Monto pagado en Bs:</b> ${totalBsLiquidado.toFixed(2)} Bs
📊 <b>Tasa aplicada:</b> ${Number(tasaPagoBs).toFixed(2)} Bs/$
🔢 <b>Ref. Interna:</b> <code>${numeroReferencia}</code>

<i>¡Muchas gracias por tu compromiso y excelente servicio en Gazzella Express! 🛵💨</i>
          `.trim();

          sendTelegramNotification(
            item.telegram_chat_id,
            mensajeTelegram
          ).catch((err) =>
            console.error(
              `⚠️ Error enviando notificación a Telegram para ${item.nombre}:`,
              err.message
            )
          );
        }
      }
    } catch (telegramErr) {
      console.error(
        "⚠️ Error enviando notificaciones de Telegram:",
        telegramErr.message
      );
    }
    // --- FIN NOTIFICACIÓN TELEGRAM ---

    return res.status(200).json({
      message: "Pago registrado definitivamente con éxito",
      lote: numeroLote,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error confirmando pago de lote:", error);
    return res
      .status(500)
      .json({
        error: "Error al liquidar el lote definitivamente",
        details: error.message,
      });
  } finally {
    client.release();
  }
};

// 🆕 2.2 Reversar el Lote (Devuelve los registros de 'procesando' a 'pendiente')
export const reversarPagoLote = async (req, res) => {
  const client = await pool.connect();
  try {
    const { numeroLote } = req.body;

    if (!numeroLote) {
      return res.status(400).json({ error: "Número de lote requerido." });
    }

    await client.query("BEGIN");

    const revertQuery = `
      UPDATE liquidaciones_repartidores
      SET 
        estado_pago_repartidor = 'pendiente',
        fecha_pago = NULL,
        tasa_pago_bs = NULL,
        numero_referencia_pago = NULL,
        numero_lote = NULL
      WHERE numero_lote = $1 AND estado_pago_repartidor = 'procesando'
      RETURNING id;
    `;

    const { rows } = await client.query(revertQuery, [numeroLote]);

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ error: "No se encontró un lote en proceso con ese código." });
    }

    await client.query("COMMIT");

    return res
      .status(200)
      .json({
        message:
          "Lote reversado exitosamente. Los registros volvieron a pendientes.",
      });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al reversar lote:", error);
    return res
      .status(500)
      .json({ error: "Error al reversar el lote", details: error.message });
  } finally {
    client.release();
  }
};

// 3. Obtener el historial de pagos realizados a repartidores (Tu función original intacta)
export const getHistorialPagosRepartidores = async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id AS repartidor_id,
        COALESCE(r.codigo_conductor, u.codigo_conductor, 'N/A') AS codigo_repartidor,
        u.nombre,
        '' AS apellido,
        COALESCE(r.documento_identidad, 'N/A') AS cedula,
        COALESCE(u.telefono, 'N/A') AS telefono,
        l.numero_referencia_pago AS numero_referencia,
        MAX(l.fecha_pago) AS fecha_pago,
        SUM(l.monto_repartidor_usd) AS monto_usd,
        SUM(l.monto_repartidor) AS monto_bs_original,
        MAX(l.tasa_pago_bs) AS tasa_pago_bs,
        COUNT(l.id) AS total_servicios
      FROM liquidaciones_repartidores l
      JOIN usuarios u ON l.repartidor_id = u.id
      LEFT JOIN repartidores r ON u.id = r.usuario_id
      WHERE LOWER(l.estado_pago_repartidor) = 'pagado'
      GROUP BY 
        u.id,
        r.codigo_conductor,
        u.codigo_conductor,
        u.nombre,
        r.documento_identidad,
        u.telefono,
        l.numero_referencia_pago
      ORDER BY MAX(l.fecha_pago) DESC;
    `;

    const { rows } = await pool.query(query);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error en getHistorialPagosRepartidores:", error);
    return res.status(500).json({
      error: "Error interno al consultar el historial de pagos",
      details: error.message,
    });
  }
};

// 🆕 Obtener los detalles de los repartidores/conductores de un lote específico en proceso
export const getDetalleLoteEnProceso = async (req, res) => {
  try {
    const { numeroLote } = req.params;

    const query = `
      SELECT 
        u.id AS repartidor_id,
        COALESCE(r.codigo_conductor, u.codigo_conductor, 'N/A') AS codigo_conductor,
        u.nombre,
        '' AS apellido,
        COALESCE(r.documento_identidad, 'N/A') AS cedula,
        COALESCE(r.codigo_banco, 'N/A') AS banco,
        COALESCE(r.numero_cuenta, 'N/A') AS numero_cuenta,
        COUNT(l.id)::int AS total_pedidos_pendientes,
        COALESCE(SUM(l.monto_repartidor_usd), 0)::numeric AS total_usd,
        MAX(l.tasa_pago_bs) AS tasa_pago_bs,
        MAX(l.numero_referencia_pago) AS numero_referencia,
        MAX(l.fecha_pago) AS fecha_bloqueo
      FROM liquidaciones_repartidores l
      JOIN usuarios u ON l.repartidor_id = u.id
      LEFT JOIN repartidores r ON u.id = r.usuario_id
      WHERE l.numero_lote = $1 AND l.estado_pago_repartidor = 'procesando'
      GROUP BY 
        u.id, 
        r.codigo_conductor, 
        u.codigo_conductor, 
        u.nombre, 
        r.documento_identidad, 
        r.codigo_banco, 
        r.numero_cuenta
      ORDER BY u.nombre ASC;
    `;

    const { rows } = await pool.query(query, [numeroLote]);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error en getDetalleLoteEnProceso:", error);
    return res
      .status(500)
      .json({
        error: "Error al obtener detalle del lote",
        details: error.message,
      });
  }
};

// import { pool } from "../../../db.js"; // Ajusta la ruta a tu conexión
// import { sendTelegramNotification } from "../../../services/telegramService.js"; // Ajusta la ruta a tu servicio de telegram

// // 1. Obtener pagos pendientes agrupados/resumidos por repartidor (con filtro de fecha opcional)
// export const getPagosPendientes = async (req, res) => {
//   try {
//     const { hasta } = req.query; // Captura la fecha límite enviada desde el frontend

//     let query = `
//       SELECT 
//         u.id AS repartidor_id,
//         COALESCE(r.codigo_conductor, u.codigo_conductor, 'N/A') AS codigo_conductor,
//         u.nombre,
//         COALESCE(r.documento_identidad, 'N/A') AS cedula,
//         COALESCE(u.telefono, 'N/A') AS telefono,
//         COALESCE(r.codigo_banco, 'N/A') AS banco,
//         COALESCE(r.numero_cuenta, 'N/A') AS numero_cuenta,
//         COUNT(l.id)::int AS total_pedidos_pendientes,
//         COALESCE(SUM(l.monto_repartidor_usd), 0)::numeric AS total_usd,
//         COALESCE(SUM(l.monto_repartidor), 0)::numeric AS total_bs_original,
//         ARRAY_AGG(l.id) AS liquidacion_ids
//       FROM liquidaciones_repartidores l
//       JOIN usuarios u ON l.repartidor_id = u.id
//       LEFT JOIN repartidores r ON u.id = r.usuario_id
//       WHERE l.estado_pago_repartidor = 'pendiente'
//     `;

//     const queryParams = [];

//     // Filtramos usando fecha_proceso que es el campo temporal de la liquidación
//     if (hasta) {
//       queryParams.push(hasta);
//       query += ` AND DATE(l.fecha_proceso) <= $${queryParams.length} `; 
//     }

//     query += `
//       GROUP BY 
//         u.id, 
//         r.codigo_conductor, 
//         u.codigo_conductor, 
//         u.nombre, 
//         r.documento_identidad, 
//         u.telefono, 
//         r.codigo_banco, 
//         r.numero_cuenta
//       ORDER BY u.nombre ASC;
//     `;

//     const { rows } = await pool.query(query, queryParams);
//     return res.status(200).json(rows);
//   } catch (error) {
//     console.error("Error en getPagosPendientes:", error);
//     return res.status(500).json({ 
//       error: "Error interno al consultar liquidaciones pendientes",
//       details: error.message 
//     });
//   }
// };

// // 🆕 Obtener pagos que están Bloqueados / En Proceso ('procesando')
// export const getPagosEnProceso = async (req, res) => {
//   try {
//     const query = `
//       SELECT 
//         l.numero_lote,
//         MAX(l.numero_referencia_pago) AS numero_referencia,
//         MAX(l.tasa_pago_bs) AS tasa_pago_bs,
//         MIN(l.fecha_pago) AS fecha_bloqueo,
//         COUNT(DISTINCT l.repartidor_id)::int AS total_repartidores,
//         COUNT(l.id)::int AS total_pedidos,
//         COALESCE(SUM(l.monto_repartidor_usd), 0)::numeric AS total_usd,
//         ARRAY_AGG(l.id) AS liquidacion_ids
//       FROM liquidaciones_repartidores l
//       WHERE l.estado_pago_repartidor = 'procesando'
//       GROUP BY l.numero_lote
//       ORDER BY fecha_bloqueo DESC;
//     `;
//     const { rows } = await pool.query(query);
//     return res.status(200).json(rows);
//   } catch (error) {
//     console.error("Error en getPagosEnProceso:", error);
//     return res
//       .status(500)
//       .json({
//         error: "Error interno al consultar pagos en proceso",
//         details: error.message,
//       });
//   }
// };

// // Helper para generar el número de lote automático
// const generarCodigoLote = () => {
//   const fecha = new Date();
//   const yyyy = fecha.getFullYear();
//   const mm = String(fecha.getMonth() + 1).padStart(2, "0");
//   const dd = String(fecha.getDate()).padStart(2, "0");
//   const aleatorio = Math.floor(1000 + Math.random() * 9000);
//   return `LOT-${yyyy}${mm}${dd}-${aleatorio}`;
// };

// // 2. Procesar pago masivo -> Actualizado para actuar como el paso intermedio (bloquea y pasa a 'procesando')
// export const procesarPagoMasivo = async (req, res) => {
//   const client = await pool.connect();
//   try {
//     const { liquidacionIds, numeroReferencia, tasaPagoBs } = req.body;

//     if (
//       !liquidacionIds ||
//       !Array.isArray(liquidacionIds) ||
//       liquidacionIds.length === 0
//     ) {
//       return res
//         .status(400)
//         .json({
//           error: "Debe seleccionar al menos una liquidación para pagar.",
//         });
//     }
//     if (!numeroReferencia || !tasaPagoBs) {
//       return res
//         .status(400)
//         .json({ error: "La referencia y la tasa de pago son obligatorias." });
//     }

//     // 🎯 Generar el número de lote automático
//     const codigoLote = generarCodigoLote();

//     await client.query("BEGIN");

//     // 🎯 Consulta UPDATE guardando en estado 'procesando' (bloqueo intermedio)
//     const updateQuery = `
//       UPDATE liquidaciones_repartidores
//       SET 
//         estado_pago_repartidor = 'procesando',
//         fecha_pago = CURRENT_TIMESTAMP,
//         tasa_pago_bs = $1,
//         numero_referencia_pago = $2,
//         numero_lote = $3
//       WHERE id = ANY($4::int[]) AND estado_pago_repartidor = 'pendiente'
//       RETURNING id;
//     `;

//     const { rows } = await client.query(updateQuery, [
//       tasaPagoBs,
//       numeroReferencia,
//       codigoLote,
//       liquidacionIds,
//     ]);

//     await client.query("COMMIT");

//     return res.status(200).json({
//       message:
//         "Lote bloqueado exitosamente en espera de liquidación definitiva",
//       lote: codigoLote,
//       procesados: rows.length,
//     });
//   } catch (error) {
//     await client.query("ROLLBACK");
//     console.error("Error procesando pago masivo (bloqueo):", error);
//     return res.status(500).json({
//       error: "Error al procesar la liquidación",
//       details: error.message,
//     });
//   } finally {
//     client.release();
//   }
// };

// // 🆕 2.1 Confirmar definitivo el pago del lote (Pasa de 'procesando' a 'pagado' y dispara Telegram)
// export const confirmarPagoLote = async (req, res) => {
//   const client = await pool.connect();
//   try {
//     const { numeroLote } = req.body;

//     if (!numeroLote) {
//       return res.status(400).json({ error: "Número de lote requerido." });
//     }

//     await client.query("BEGIN");

//     const updateQuery = `
//       UPDATE liquidaciones_repartidores
//       SET estado_pago_repartidor = 'pagado'
//       WHERE numero_lote = $1 AND estado_pago_repartidor = 'procesando'
//       RETURNING id, repartidor_id, monto_repartidor_usd, tasa_pago_bs, numero_referencia_pago;
//     `;

//     const { rows } = await client.query(updateQuery, [numeroLote]);

//     if (rows.length === 0) {
//       await client.query("ROLLBACK");
//       return res
//         .status(404)
//         .json({
//           error: "No se encontraron registros en proceso para este lote.",
//         });
//     }

//     await client.query("COMMIT");

//     // --- NOTIFICACIÓN TELEGRAM ---
//     try {
//       const liquidacionIds = rows.map((r) => r.id);
//       const tasaPagoBs = rows[0].tasa_pago_bs;
//       const numeroReferencia = rows[0].numero_referencia_pago;

//       const datosNotificacionQuery = `
//         SELECT 
//           u.nombre,
//           r.telegram_chat_id,
//           COUNT(l.id) AS total_servicios,
//           COALESCE(SUM(l.monto_repartidor_usd), 0) AS total_usd
//         FROM liquidaciones_repartidores l
//         JOIN usuarios u ON l.repartidor_id = u.id
//         LEFT JOIN repartidores r ON u.id = r.usuario_id
//         WHERE l.id = ANY($1::int[])
//         GROUP BY u.nombre, r.telegram_chat_id;
//       `;

//       const notifRes = await pool.query(datosNotificacionQuery, [
//         liquidacionIds,
//       ]);

//       for (const item of notifRes.rows) {
//         if (item.telegram_chat_id) {
//           const totalUsd = Number(item.total_usd);
//           const totalBsLiquidado = totalUsd * Number(tasaPagoBs);

//           const mensajeTelegram = `
// <b>🎉 ¡LIQUIDACIÓN PROCESADA! 💵✨</b>
// ───────────────────────
// Hola <b>${
//             item.nombre
//           }</b>, se ha registrado exitosamente el pago de tu liquidación.

// 📦 <b>Nro. Lote Liquidación:</b> <code>${numeroLote}</code>
// 📋 <b>Servicios liquidados:</b> ${item.total_servicios}
// 💰 <b>Monto en USD:</b> $${totalUsd.toFixed(2)}
// 🇻🇪 <b>Monto pagado en Bs:</b> ${totalBsLiquidado.toFixed(2)} Bs
// 📊 <b>Tasa aplicada:</b> ${Number(tasaPagoBs).toFixed(2)} Bs/$
// 🔢 <b>Ref. Interna:</b> <code>${numeroReferencia}</code>

// <i>¡Muchas gracias por tu compromiso y excelente servicio en Gazzella Express! 🛵💨</i>
//           `.trim();

//           sendTelegramNotification(
//             item.telegram_chat_id,
//             mensajeTelegram
//           ).catch((err) =>
//             console.error(
//               `⚠️ Error enviando notificación a Telegram para ${item.nombre}:`,
//               err.message
//             )
//           );
//         }
//       }
//     } catch (telegramErr) {
//       console.error(
//         "⚠️ Error enviando notificaciones de Telegram:",
//         telegramErr.message
//       );
//     }
//     // --- FIN NOTIFICACIÓN TELEGRAM ---

//     return res.status(200).json({
//       message: "Pago registrado definitivamente con éxito",
//       lote: numeroLote,
//     });
//   } catch (error) {
//     await client.query("ROLLBACK");
//     console.error("Error confirmando pago de lote:", error);
//     return res
//       .status(500)
//       .json({
//         error: "Error al liquidar el lote definitivamente",
//         details: error.message,
//       });
//   } finally {
//     client.release();
//   }
// };

// // 🆕 2.2 Reversar el Lote (Devuelve los registros de 'procesando' a 'pendiente')
// export const reversarPagoLote = async (req, res) => {
//   const client = await pool.connect();
//   try {
//     const { numeroLote } = req.body;

//     if (!numeroLote) {
//       return res.status(400).json({ error: "Número de lote requerido." });
//     }

//     await client.query("BEGIN");

//     const revertQuery = `
//       UPDATE liquidaciones_repartidores
//       SET 
//         estado_pago_repartidor = 'pendiente',
//         fecha_pago = NULL,
//         tasa_pago_bs = NULL,
//         numero_referencia_pago = NULL,
//         numero_lote = NULL
//       WHERE numero_lote = $1 AND estado_pago_repartidor = 'procesando'
//       RETURNING id;
//     `;

//     const { rows } = await client.query(revertQuery, [numeroLote]);

//     if (rows.length === 0) {
//       await client.query("ROLLBACK");
//       return res
//         .status(404)
//         .json({ error: "No se encontró un lote en proceso con ese código." });
//     }

//     await client.query("COMMIT");

//     return res
//       .status(200)
//       .json({
//         message:
//           "Lote reversado exitosamente. Los registros volvieron a pendientes.",
//       });
//   } catch (error) {
//     await client.query("ROLLBACK");
//     console.error("Error al reversar lote:", error);
//     return res
//       .status(500)
//       .json({ error: "Error al reversar el lote", details: error.message });
//   } finally {
//     client.release();
//   }
// };

// // 3. Obtener el historial de pagos realizados a repartidores (Tu función original intacta)
// export const getHistorialPagosRepartidores = async (req, res) => {
//   try {
//     const query = `
//       SELECT 
//         u.id AS repartidor_id,
//         COALESCE(r.codigo_conductor, u.codigo_conductor, 'N/A') AS codigo_repartidor,
//         u.nombre,
//         '' AS apellido,
//         COALESCE(r.documento_identidad, 'N/A') AS cedula,
//         COALESCE(u.telefono, 'N/A') AS telefono,
//         l.numero_referencia_pago AS numero_referencia,
//         MAX(l.fecha_pago) AS fecha_pago,
//         SUM(l.monto_repartidor_usd) AS monto_usd,
//         SUM(l.monto_repartidor) AS monto_bs_original,
//         MAX(l.tasa_pago_bs) AS tasa_pago_bs,
//         COUNT(l.id) AS total_servicios
//       FROM liquidaciones_repartidores l
//       JOIN usuarios u ON l.repartidor_id = u.id
//       LEFT JOIN repartidores r ON u.id = r.usuario_id
//       WHERE LOWER(l.estado_pago_repartidor) = 'pagado'
//       GROUP BY 
//         u.id,
//         r.codigo_conductor,
//         u.codigo_conductor,
//         u.nombre,
//         r.documento_identidad,
//         u.telefono,
//         l.numero_referencia_pago
//       ORDER BY MAX(l.fecha_pago) DESC;
//     `;

//     const { rows } = await pool.query(query);
//     return res.status(200).json(rows);
//   } catch (error) {
//     console.error("Error en getHistorialPagosRepartidores:", error);
//     return res.status(500).json({
//       error: "Error interno al consultar el historial de pagos",
//       details: error.message,
//     });
//   }
// };

// // 🆕 Obtener los detalles de los repartidores/conductores de un lote específico en proceso
// export const getDetalleLoteEnProceso = async (req, res) => {
//   try {
//     const { numeroLote } = req.params;

//     const query = `
//       SELECT 
//         u.id AS repartidor_id,
//         COALESCE(r.codigo_conductor, u.codigo_conductor, 'N/A') AS codigo_conductor,
//         u.nombre,
//         '' AS apellido,
//         COALESCE(r.documento_identidad, 'N/A') AS cedula,
//         COALESCE(r.codigo_banco, 'N/A') AS banco,
//         COALESCE(r.numero_cuenta, 'N/A') AS numero_cuenta,
//         COUNT(l.id)::int AS total_pedidos_pendientes,
//         COALESCE(SUM(l.monto_repartidor_usd), 0)::numeric AS total_usd,
//         MAX(l.tasa_pago_bs) AS tasa_pago_bs,
//         MAX(l.numero_referencia_pago) AS numero_referencia,
//         MAX(l.fecha_pago) AS fecha_bloqueo
//       FROM liquidaciones_repartidores l
//       JOIN usuarios u ON l.repartidor_id = u.id
//       LEFT JOIN repartidores r ON u.id = r.usuario_id
//       WHERE l.numero_lote = $1 AND l.estado_pago_repartidor = 'procesando'
//       GROUP BY 
//         u.id, 
//         r.codigo_conductor, 
//         u.codigo_conductor, 
//         u.nombre, 
//         r.documento_identidad, 
//         r.codigo_banco, 
//         r.numero_cuenta
//       ORDER BY u.nombre ASC;
//     `;

//     const { rows } = await pool.query(query, [numeroLote]);
//     return res.status(200).json(rows);
//   } catch (error) {
//     console.error("Error en getDetalleLoteEnProceso:", error);
//     return res
//       .status(500)
//       .json({
//         error: "Error al obtener detalle del lote",
//         details: error.message,
//       });
//   }
// };
