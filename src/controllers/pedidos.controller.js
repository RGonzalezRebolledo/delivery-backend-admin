// controllers/pedidosController.js
import { pool } from "../db.js";

export const getServiciosRealizados = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id AS pedido_id,
        p.nro_recibo,
        p.fecha_pedido,
        p.fecha_entrega,
        p.estado,
        p.total,
        p.total_dolar,
        p.municipio_origen,
        p.municipio_destino,
        p.pago_confirmado,
        p.telefono_pagador,
        p.banco_origen,
        
        -- Datos del Cliente (usuarios)
        u_cli.id AS cliente_id,
        u_cli.nombre AS cliente_nombre,
        u_cli.email AS cliente_email,
        u_cli.telefono AS cliente_telefono,
        
        -- Datos del Repartidor (usuarios + repartidores)
        u_rep.id AS repartidor_id,
        u_rep.nombre AS repartidor_nombre,
        u_rep.telefono AS repartidor_telefono,
        u_rep.codigo_conductor AS repartidor_codigo,
        rep.documento_identidad AS repartidor_documento,
        
        -- Direcciones desde pedidos
        p.municipio_origen AS direccion_origen_texto,
        p.municipio_destino AS direccion_destino_texto,

        -- Tipo de Servicio y Vehículo (Usando 'descript')
        ts.descript AS tipo_servicio,
        tv.descript AS tipo_vehiculo

      FROM pedidos p
      LEFT JOIN usuarios u_cli ON p.cliente_id = u_cli.id
      LEFT JOIN usuarios u_rep ON p.repartidor_id = u_rep.id
      LEFT JOIN repartidores rep ON rep.usuario_id = u_rep.id
      LEFT JOIN tipos_servicios ts ON p.tipo_servicio_id = ts.id
      LEFT JOIN tipos_vehiculos tv ON p.tipo_vehiculo_id = tv.id
      ORDER BY p.fecha_pedido DESC;
    `;

    const { rows } = await pool.query(query); 
    
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error al consultar servicios realizados:', error);
    return res.status(500).json({ 
      message: 'Error al obtener el historial de servicios realizados',
      error: error.message 
    });
  }
};

// // controllers/pedidosController.js
// import { pool } from "../../../db.js";

// export const getServiciosRealizados = async (req, res) => {
//   try {
//     const query = `
//       SELECT 
//         p.id AS pedido_id,
//         p.nro_recibo,
//         p.fecha_pedido,
//         p.fecha_entrega,
//         p.estado,
//         p.total,
//         p.total_dolar,
//         p.municipio_origen,
//         p.municipio_destino,
//         p.pago_confirmado,
//         p.telefono_pagador,
//         p.banco_origen,
        
//         -- Datos del Cliente (usuarios)
//         u_cli.id AS cliente_id,
//         u_cli.nombre AS cliente_nombre,
//         u_cli.email AS cliente_email,
//         u_cli.telefono AS cliente_telefono,
        
//         -- Datos del Repartidor (usuarios + repartidores)
//         u_rep.id AS repartidor_id,
//         u_rep.nombre AS repartidor_nombre,
//         u_rep.telefono AS repartidor_telefono,
//         u_rep.codigo_conductor AS repartidor_codigo,
//         rep.documento_identidad AS repartidor_documento,
        
//         -- Direcciones (Obtenidas directamente de la tabla pedidos para evitar columnas faltantes)
//         p.municipio_origen AS direccion_origen_texto,
//         p.municipio_destino AS direccion_destino_texto

//       FROM pedidos p
//       LEFT JOIN usuarios u_cli ON p.cliente_id = u_cli.id
//       LEFT JOIN usuarios u_rep ON p.repartidor_id = u_rep.id
//       LEFT JOIN repartidores rep ON rep.usuario_id = u_rep.id
//       ORDER BY p.fecha_pedido DESC;
//     `;

//     const { rows } = await pool.query(query); 
    
//     return res.status(200).json(rows);
//   } catch (error) {
//     // Imprimimos el error completo para identificar fácilmente si persiste
//     console.error('Error en getServiciosRealizados:', error);
//     return res.status(500).json({ 
//       message: 'Error al obtener el historial de servicios realizados',
//       error: error.message 
//     });
//   }
// };

