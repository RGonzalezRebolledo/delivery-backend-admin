import { google } from "googleapis";

// Configuración del cliente OAuth2 de Google
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground" // URI de redirección usada para el token
);

// Le pasamos el refresh token para que genere access tokens automáticamente cuando expiren
oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

// Inicializamos el cliente de Gmail vía HTTP
const gmail = google.gmail({ version: "v1", auth: oauth2Client });

/**
 * Función para codificar el email en Base64 seguro para URL (Formato requerido por la API de Google)
 */
const crearEmailEstructurado = (to, subject, htmlBody) => {
  const remitente = process.env.SMTP_USER;

  // Nombre limpio que queremos mostrar
  const nombreMostrar = "Gazzella Express 🎯";

  // Codificamos de manera segura tanto el nombre del remitente como el asunto en Base64 UTF-8
  const fromNameEncoded = `=?utf-8?B?${Buffer.from(nombreMostrar).toString(
    "base64"
  )}?=`;
  const subjectEncoded = `=?utf-8?B?${Buffer.from(subject).toString(
    "base64"
  )}?=`;

  const str = [
    `From: ${fromNameEncoded} <${remitente}>`,
    `To: ${to}`,
    `Subject: ${subjectEncoded}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    htmlBody,
  ].join("\r\n");

  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

// 📦 ENVÍO DE CORREO PARA NUEVO PEDIDO (CHOFERES)
export const enviarCorreoNuevoPedido = async (correoChofer, datosPedido) => {
  if (!correoChofer) {
    console.warn("⚠️ [Email Service] El chofer no tiene email registrado.");
    return null;
  }

  try {
    console.log(
      `⏳ [Email Service] Enviando correo vía Gmail API (HTTP) a: ${correoChofer}...`
    );

    const subject = `🎯 ¡Nuevo Pedido Disponible #${datosPedido.pedido_id}!`;
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
        <h2 style="color: #e67e22; text-align: center;">🎯 ¡Gazzella Express - Nuevo Pedido Asignado!</h2>
        <p>Hola, tienes un nuevo pedido disponible en la plataforma listo para ser procesado:</p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <ul>
          <li><strong>Pedido ID:</strong> #${datosPedido.pedido_id}</li>
          <li><strong>Tipo de Servicio:</strong> ${
            datosPedido.tipo_servicio
          }</li>
          <li><strong>Dirección de Recogida:</strong> ${
            datosPedido.pickupAddress || datosPedido.recogida
          }</li>
          <li><strong>Dirección de Entrega:</strong> ${
            datosPedido.deliveryAddress || datosPedido.entrega
          }</li>
          <li><strong>Monto:</strong> $${datosPedido.monto_usd}</li>
        </ul>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #7f8c8d; text-align: center;">Por favor ingresa a la aplicación para aceptar o rechazar el pedido.</p>
      </div>
    `;

    const rawEmail = crearEmailEstructurado(correoChofer, subject, htmlBody);

    const respuesta = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: rawEmail,
      },
    });

    console.log(
      `✉️ [Email Service] ¡ÉXITO TOTAL! Correo enviado por API HTTP. ID del Mensaje: ${respuesta.data.id}`
    );
    return respuesta.data;
  } catch (error) {
    console.error(
      "❌ [Email Service] ERROR CRÍTICO EN GMAIL API:",
      error.message || error
    );
    throw error;
  }
};

// 🔑 ENVÍO DE CORREO PARA VERIFICACIÓN (REGISTRO NUEVO)
export const enviarCorreoVerificacion = async (
  emailUsuario,
  nombreUsuario,
  enlaceVerificacion,
  tipo
) => {
  if (!emailUsuario) {
    console.warn("⚠️ [Email Service] El usuario no tiene email válido.");
    return null;
  }

  try {
    console.log(
      `⏳ [Email Service] Enviando correo de verificación vía Gmail API a: ${emailUsuario}...`
    );

    const mensajeTexto =
      tipo === "repartidor"
        ? "Para completar tu registro y empezar a Realizar servicios como conductor en San Fernando, por favor confirma tu cuenta haciendo clic en el siguiente botón:"
        : "Para completar tu registro y empezar a pedir tus deliverys en San Fernando, por favor confirma tu cuenta haciendo clic en el siguiente botón:";

    const subject = "🔑 Verifica tu cuenta en Gazzella Express";
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2e7d32; text-align: center;">¡Bienvenido a Gazzella Express, ${nombreUsuario}!</h2>
        <p style="color: #444; font-size: 15px; line-height: 1.5;">
          ${mensajeTexto}
        </p>
        
        <!-- 🛡️ BOTÓN COMPATIBLE CON YAHOO Y OUTLOOK -->
        <table border="0" cellspacing="0" cellpadding="0" style="margin: 25px auto;">
          <tr>
            <td align="center" bgcolor="#2e7d32" style="border-radius: 5px;">
              <a href="${enlaceVerificacion}" target="_blank" style="font-size: 16px; font-family: sans-serif; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 5px; border: 1px solid #2e7d32; display: inline-block; font-weight: bold;">
                Verificar mi Cuenta
              </a>
            </td>
          </tr>
        </table>

        <p style="color: #555; font-size: 13px; text-align: center; word-break: break-all;">
          Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
          <a href="${enlaceVerificacion}" style="color: #2e7d32;">${enlaceVerificacion}</a>
        </p>

        <p style="color: #777; font-size: 12px; text-align: center;">
          Este enlace expirará en 15 minutos. Si no te has registrado en nuestra app, ignora este correo.
        </p>
      </div>
    `;

    const rawEmail = crearEmailEstructurado(emailUsuario, subject, htmlBody);

    const respuesta = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: rawEmail,
      },
    });

    console.log(
      `📩 [Email Service] Correo de verificación enviado con éxito vía Gmail API. ID: ${respuesta.data.id}`
    );
    return respuesta.data;
  } catch (error) {
    console.error(
      "❌ [Email Service] Error enviando correo de verificación:",
      error.message || error
    );
    throw error;
  }
};

// 🔑 ENVÍO DE CORREO PARA RESTABLECER CONTRASEÑA
export const enviarCorreoRestablecerPassword = async (
  emailUsuario,
  nombreUsuario,
  enlaceRestablecimiento
) => {
  if (!emailUsuario) {
    console.warn("⚠️ [Email Service] El usuario no tiene email válido.");
    return null;
  }

  try {
    console.log(
      `⏳ [Email Service] Enviando correo de restablecimiento vía Gmail API a: ${emailUsuario}...`
    );

    const subject = "🔒 Reestablece tu contraseña - Gazzella Express";
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #0f172a; text-align: center;">🎯 Gazzella Express</h2>
        <p style="color: #444; font-size: 15px; line-height: 1.5;">
          Hola, <strong>${nombreUsuario}</strong>. Recibimos una solicitud para restablecer la contraseña de tu cuenta.
        </p>
        <p style="color: #444; font-size: 15px; line-height: 1.5;">
          Haz clic en el siguiente botón para ingresar una nueva contraseña:
        </p>
        
        <!-- 🛡️ BOTÓN COMPATIBLE CON YAHOO Y OUTLOOK -->
        <table border="0" cellspacing="0" cellpadding="0" style="margin: 25px auto;">
          <tr>
            <td align="center" bgcolor="#0f172a" style="border-radius: 5px;">
              <a href="${enlaceRestablecimiento}" target="_blank" style="font-size: 16px; font-family: sans-serif; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 5px; border: 1px solid #0f172a; display: inline-block; font-weight: bold;">
                Restablecer Contraseña
              </a>
            </td>
          </tr>
        </table>

        <p style="color: #555; font-size: 13px; text-align: center; word-break: break-all;">
          Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
          <a href="${enlaceRestablecimiento}" style="color: #0f172a;">${enlaceRestablecimiento}</a>
        </p>

        <p style="color: #777; font-size: 12px; text-align: center;">
          Este enlace expirará en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo de manera segura.
        </p>
      </div>
    `;

    const rawEmail = crearEmailEstructurado(emailUsuario, subject, htmlBody);

    const respuesta = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: rawEmail,
      },
    });

    console.log(
      `📩 [Email Service] Correo de restablecimiento enviado con éxito. ID: ${respuesta.data.id}`
    );
    return respuesta.data;
  } catch (error) {
    console.error(
      "❌ [Email Service] Error enviando correo de restablecimiento:",
      error.message || error
    );
    throw error;
  }
};


// import { google } from "googleapis";

// // Configuración del cliente OAuth2 de Google
// const oauth2Client = new google.auth.OAuth2(
//   process.env.GMAIL_CLIENT_ID,
//   process.env.GMAIL_CLIENT_SECRET,
//   "https://developers.google.com/oauthplayground" // URI de redirección usada para el token
// );

// // Le pasamos el refresh token para que genere access tokens automáticamente cuando expiren
// oauth2Client.setCredentials({
//   refresh_token: process.env.GMAIL_REFRESH_TOKEN,
// });

// // Inicializamos el cliente de Gmail vía HTTP
// const gmail = google.gmail({ version: "v1", auth: oauth2Client });

// /**
//  * Función para codificar el email en Base64 seguro para URL (Formato requerido por la API de Google)
//  */
// const crearEmailEstructurado = (to, subject, htmlBody) => {
//   const remitente = process.env.SMTP_USER;

//   // Nombre limpio que queremos mostrar
//   const nombreMostrar = "Gazzella Express 🎯";

//   // Codificamos de manera segura tanto el nombre del remitente como el asunto en Base64 UTF-8
//   const fromNameEncoded = `=?utf-8?B?${Buffer.from(nombreMostrar).toString(
//     "base64"
//   )}?=`;
//   const subjectEncoded = `=?utf-8?B?${Buffer.from(subject).toString(
//     "base64"
//   )}?=`;

//   const str = [
//     `From: ${fromNameEncoded} <${remitente}>`,
//     `To: ${to}`,
//     `Subject: ${subjectEncoded}`,
//     "MIME-Version: 1.0",
//     "Content-Type: text/html; charset=utf-8",
//     "Content-Transfer-Encoding: 7bit",
//     "",
//     htmlBody,
//   ].join("\r\n");

//   return Buffer.from(str)
//     .toString("base64")
//     .replace(/\+/g, "-")
//     .replace(/\//g, "_")
//     .replace(/=+$/, "");
// };

// // 📦 ENVÍO DE CORREO PARA NUEVO PEDIDO (CHOFERES)
// export const enviarCorreoNuevoPedido = async (correoChofer, datosPedido) => {
//   if (!correoChofer) {
//     console.warn("⚠️ [Email Service] El chofer no tiene email registrado.");
//     return null;
//   }

//   try {
//     console.log(
//       `⏳ [Email Service] Enviando correo vía Gmail API (HTTP) a: ${correoChofer}...`
//     );

//     const subject = `🎯 ¡Nuevo Pedido Disponible #${datosPedido.pedido_id}!`;
//     const htmlBody = `
//       <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
//         <h2 style="color: #e67e22; text-align: center;">🎯 ¡Gazzella Express - Nuevo Pedido Asignado!</h2>
//         <p>Hola, tienes un nuevo pedido disponible en la plataforma listo para ser procesado:</p>
//         <hr style="border: none; border-top: 1px solid #eee;" />
//         <ul>
//           <li><strong>Pedido ID:</strong> #${datosPedido.pedido_id}</li>
//           <li><strong>Tipo de Servicio:</strong> ${
//             datosPedido.tipo_servicio
//           }</li>
//           <li><strong>Dirección de Recogida:</strong> ${
//             datosPedido.pickupAddress || datosPedido.recogida
//           }</li>
//           <li><strong>Dirección de Entrega:</strong> ${
//             datosPedido.deliveryAddress || datosPedido.entrega
//           }</li>
//           <li><strong>Monto:</strong> $${datosPedido.monto_usd}</li>
//         </ul>
//         <hr style="border: none; border-top: 1px solid #eee;" />
//         <p style="font-size: 12px; color: #7f8c8d; text-align: center;">Por favor ingresa a la aplicación para aceptar o rechazar el pedido.</p>
//       </div>
//     `;

//     const rawEmail = crearEmailEstructurado(correoChofer, subject, htmlBody);

//     const respuesta = await gmail.users.messages.send({
//       userId: "me",
//       requestBody: {
//         raw: rawEmail,
//       },
//     });

//     console.log(
//       `✉️ [Email Service] ¡ÉXITO TOTAL! Correo enviado por API HTTP. ID del Mensaje: ${respuesta.data.id}`
//     );
//     return respuesta.data;
//   } catch (error) {
//     console.error(
//       "❌ [Email Service] ERROR CRÍTICO EN GMAIL API:",
//       error.message || error
//     );
//     throw error;
//   }
// };

// // 🔑 ENVÍO DE CORREO PARA VERIFICACIÓN (REGISTRO NUEVO)
// // 💡 Se añade el parámetro 'tipo' para personalizar el mensaje dinámicamente
// export const enviarCorreoVerificacion = async (
//   emailUsuario,
//   nombreUsuario,
//   enlaceVerificacion,
//   tipo
// ) => {
//   if (!emailUsuario) {
//     console.warn("⚠️ [Email Service] El usuario no tiene email válido.");
//     return null;
//   }

//   try {
//     console.log(
//       `⏳ [Email Service] Enviando correo de verificación vía Gmail API a: ${emailUsuario}...`
//     );

//     // Definimos el texto condicional según el rol del usuario
//     const mensajeTexto =
//       tipo === "repartidor"
//         ? "Para completar tu registro y empezar a Realizar servicios como conductor en San Fernando, por favor confirma tu cuenta haciendo clic en el siguiente botón:"
//         : "Para completar tu registro y empezar a pedir tus deliverys en San Fernando, por favor confirma tu cuenta haciendo clic en el siguiente botón:";

//     const subject = "🔑 Verifica tu cuenta en Gazzella Express";
//     const htmlBody = `
//       <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
//         <h2 style="color: #2e7d32; text-align: center;">¡Bienvenido a Gazzella Express, ${nombreUsuario}!</h2>
//         <p style="color: #444; font-size: 15px; line-height: 1.5;">
//           ${mensajeTexto}
//         </p>
//         <div style="text-align: center; margin: 25px 0;">
//           <a href="${enlaceVerificacion}" style="background-color: #2e7d32; color: white; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">
//             Verificar mi Cuenta
//           </a>
//         </div>
//         <p style="color: #777; font-size: 12px; text-align: center;">
//           Este enlace expirará en 15 minutos. Si no te has registrado en nuestra app, ignora este correo.
//         </p>
//       </div>
//     `;

//     const rawEmail = crearEmailEstructurado(emailUsuario, subject, htmlBody);

//     const respuesta = await gmail.users.messages.send({
//       userId: "me",
//       requestBody: {
//         raw: rawEmail,
//       },
//     });

//     console.log(
//       `📩 [Email Service] Correo de verificación enviado con éxito vía Gmail API. ID: ${respuesta.data.id}`
//     );
//     return respuesta.data;
//   } catch (error) {
//     console.error(
//       "❌ [Email Service] Error enviando correo de verificación:",
//       error.message || error
//     );
//     throw error;
//   }
// };

// // 🔑 ENVÍO DE CORREO PARA RESTABLECER CONTRASEÑA
// export const enviarCorreoRestablecerPassword = async (
//   emailUsuario,
//   nombreUsuario,
//   enlaceRestablecimiento
// ) => {
//   if (!emailUsuario) {
//     console.warn("⚠️ [Email Service] El usuario no tiene email válido.");
//     return null;
//   }

//   try {
//     console.log(
//       `⏳ [Email Service] Enviando correo de restablecimiento vía Gmail API a: ${emailUsuario}...`
//     );

//     const subject = "🔒 Reestablece tu contraseña - Gazzella Express";
//     const htmlBody = `
//       <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
//         <h2 style="color: #0f172a; text-align: center;">🎯 Gazzella Express</h2>
//         <p style="color: #444; font-size: 15px; line-height: 1.5;">
//           Hola, <strong>${nombreUsuario}</strong>. Recibimos una solicitud para restablecer la contraseña de tu cuenta.
//         </p>
//         <p style="color: #444; font-size: 15px; line-height: 1.5;">
//           Haz clic en el siguiente botón para ingresar una nueva contraseña:
//         </p>
//         <div style="text-align: center; margin: 25px 0;">
//           <a href="${enlaceRestablecimiento}" style="background-color: #0f172a; color: white; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">
//             Restablecer Contraseña
//           </a>
//         </div>
//         <p style="color: #777; font-size: 12px; text-align: center;">
//           Este enlace expirará en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo de manera segura.
//         </p>
//       </div>
//     `;

//     const rawEmail = crearEmailEstructurado(emailUsuario, subject, htmlBody);

//     const respuesta = await gmail.users.messages.send({
//       userId: "me",
//       requestBody: {
//         raw: rawEmail,
//       },
//     });

//     console.log(
//       `📩 [Email Service] Correo de restablecimiento enviado con éxito. ID: ${respuesta.data.id}`
//     );
//     return respuesta.data;
//   } catch (error) {
//     console.error(
//       "❌ [Email Service] Error enviando correo de restablecimiento:",
//       error.message || error
//     );
//     throw error;
//   }
// };




