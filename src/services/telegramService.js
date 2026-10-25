/**
 * Envía un mensaje automático al chofer vía Telegram API (HTTP)
 * @param {string|number} telegramChatId - El ID de Telegram guardado en la DB del chofer
 * @param {object} datosPedido - Objeto con la info del Pedido
 */

// import fetch from "node-fetch";

export const enviarNotificacionTelegram = async (telegramChatId, datosPedido) => {
  if (!telegramChatId) {
    console.warn("⚠️ [Telegram Service] El chofer no tiene Telegram vinculado.");
    return null;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("❌ [Telegram Service] Falta TELEGRAM_BOT_TOKEN en el .env");
    return null;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  // Usamos HTML para evitar errores de sintaxis con caracteres especiales
  const textoMensaje = `
<b>🎯 GAZZELLA EXPRESS - ¡NUEVO SERVICIO!</b>
───────────────────────
📦 <b>Pedido ID:</b> #${datosPedido.pedido_id || datosPedido.id}
🛵 <b>Servicio:</b> ${datosPedido.tipo_servicio || 'DELIVERY'}
📍 <b>Origen:</b> ${datosPedido.pickupAddress || datosPedido.recogida || 'No especificada'}
🏁 <b>Destino:</b> ${datosPedido.deliveryAddress || datosPedido.entrega || 'No especificado'}
💵 <b>Monto a Cobrar:</b> $${datosPedido.monto_usd} (${datosPedido.monto_ves ? `${datosPedido.monto_ves} Bs.` : 'N/A'})

⚡ <i>Por favor, ingresa de inmediato a la aplicación para aceptar o rechazar el servicio.</i>
  `.trim();

  try {
    console.log(`⏳ [Telegram Service] Enviando alerta automática al chat: ${telegramChatId}...`);

    const respuesta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: textoMensaje,
        parse_mode: "HTML",
      }),
    });

    const resultado = await respuesta.json();

    if (!resultado.ok) {
      console.error("❌ [Telegram Service] Error devuelto por Telegram:", resultado.description);
      return null;
    }

    console.log(`🚀 [Telegram Service] ¡ÉXITO! Notificación enviada. MessageID: ${resultado.result.message_id}`);
    return resultado.result;

  } catch (error) {
    console.error("❌ [Telegram Service] Error crítico enviando a Telegram:", error);
    return null; 
  }
};



export const enviarNotificacionTelegramConBoton = async (chatId, driverId) => {
    if (!chatId) return;

    const urlEnviar = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    // Mensaje con formato HTML
    const mensaje = `
<b>⚠️ GAZZELLA EXPRESS - VERIFICACIÓN DE ACTIVIDAD</b>
───────────────────────
Han pasado 15 minutos. Para mantenerte disponible y recibir pedidos, debes confirmar tu actividad en los próximos <b>5 minutos</b> o serás sacado de servicio automáticamente.
    `.trim();

    // Opcional: Podríamos agregar un botón interactivo inline si lo deseas, 
    // o simplemente pedirle que entre al dashboard de la app.
    try {
        await fetch(urlEnviar, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text: mensaje,
                parse_mode: "HTML",
            }),
        });
    } catch (err) {
        console.error("❌ Error enviando alerta de inactividad por Telegram:", err.message);
    }
};



// import fetch from "node-fetch";

// export const sendTelegramNotification = async (chatId, messageText) => {
//   if (!chatId) return;

//   const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

//   try {
//     await fetch(url, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         chat_id: chatId,
//         text: messageText,
//         parse_mode: "HTML",
//       }),
//     });
//   } catch (error) {
//     console.error("❌ Error enviando notificación a Telegram:", error.message);
//   }
// };


export const sendTelegramNotification = async (chatId, messageText) => {
  if (!chatId) return;

  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: "HTML",
      }),
    });
  } catch (error) {
    console.error("❌ Error enviando notificación a Telegram:", error.message);
  }
};

/**
 * Envía la notificación de liquidación/pago procesado al conductor
 */
export const enviarNotificacionPagoTelegram = async (chatId, datosPago) => {
  if (!chatId) return;

  const { nombreConductor, montoUsd, montoBs, referencia, tasaPagoBs, totalServicios } = datosPago;

  const textoMensaje = `
<b>🎉 ¡LIQUIDACIÓN PROCESADA! 💵✨</b>
───────────────────────
Hola <b>${nombreConductor}</b>, se ha registrado exitosamente el pago de tu liquidación.

📋 <b>Servicios liquidados:</b> ${totalServicios}
💰 <b>Monto en USD:</b> $${Number(montoUsd).toFixed(2)}
🇻🇪 <b>Monto pagado en Bs:</b> ${Number(montoBs).toFixed(2)} Bs
📊 <b>Tasa aplicable:</b> ${Number(tasaPagoBs).toFixed(2)} Bs/$
🔢 <b>Nro. Referencia:</b> <code>${referencia}</code>

<i>¡Muchas gracias por tu compromiso y excelente servicio en Gazzella Express! 🛵💨</i>
  `.trim();

  await sendTelegramNotification(chatId, textoMensaje);
};



// /**
//  * Envía un mensaje automático al chofer vía Telegram API (HTTP)
//  * @param {string} telegramChatId - El ID de Telegram guardado en la DB del chofer
//  * @param {object} datosPedido - Objeto con la info del Pedido #56, #57, etc.
//  */
// export const enviarNotificacionTelegram = async (telegramChatId, datosPedido) => {
//     if (!telegramChatId) {
//       console.warn("⚠️ [Telegram Service] El chofer no tiene Telegram vinculado.");
//       return null;
//     }
  
//     const token = process.env.TELEGRAM_BOT_TOKEN;
//     if (!token) {
//       console.error("❌ [Telegram Service] Falta TELEGRAM_BOT_TOKEN en el .env");
//       return null;
//     }
  
//     const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
//     // Estructuramos un mensaje profesional con formato Markdown y Emojis
//     const textoMensaje = `
//   🎯 *¡GAZZELLA EXPRESS - NUEVO PEDIDO!*
//   ---
//   📦 *Pedido ID:* #${datosPedido.pedido_id}
//   🛵 *Servicio:* ${datosPedido.tipo_servicio || 'DELIVERY'}
//   📍 *Origen:* ${datosPedido.pickupAddress || datosPedido.recogida || 'No especificada'}
//   🏁 *Destino:* ${datosPedido.deliveryAddress || datosPedido.entrega || 'No especificado'}
//   💵 *Monto a Cobrar:* $${datosPedido.monto_usd}
  
//   ⚡ _Por favor, ingresa de inmediato a la aplicación para aceptar o rechazar el servicio._
//     `.trim();
  
//     try {
//       console.log(`⏳ [Telegram Service] Enviando alerta automática al chat: ${telegramChatId}...`);
  
//       const respuesta = await fetch(url, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           chat_id: telegramChatId,
//           text: textoMensaje,
//           parse_mode: "Markdown", // Permite negritas, cursivas, etc.
//         }),
//       });
  
//       const resultado = await respuesta.json();
  
//       if (!resultado.ok) {
//         console.error("❌ [Telegram Service] Error devuelto por Telegram:", resultado.description);
//         return null;
//       }
  
//       console.log(`🚀 [Telegram Service] ¡ÉXITO! Notificación enviada a Telegram. MessageID: ${resultado.result.message_id}`);
//       return resultado.result;
  
//     } catch (error) {
//       console.error("❌ [Telegram Service] Error crítico enviando a Telegram:", error);
//       // No lanzamos el throw para que si Telegram falla, no tumbe la creación del pedido principal
//       return null; 
//     }
//   };