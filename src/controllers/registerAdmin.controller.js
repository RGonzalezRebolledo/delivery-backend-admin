import bcryptjs from 'bcryptjs'
import { pool } from "../db.js";
import crypto from 'crypto' // 🔑 Importación nativa para generar tokens aleatorios
import { enviarCorreoVerificacion } from '../services/emailService.js'; 

// 🔑 REGISTRAR USUARIO DESDE EL PANEL DE ADMINISTRACIÓN (CON VERIFICACIÓN POR CORREO)
export const createUserByAdmin = async (req, res) => {
    const { password_hash, nombre, email, telefono, tipo } = req.body;
  
    // 1. Validar que no falten datos
    if (!password_hash || !nombre || !telefono || !tipo || !email) {
      return res.status(400).json({ error: "Todos los datos son requeridos, verifique." });
    }
  
    const cleanEmail = email.trim().toLowerCase();
    const cleanTelefono = telefono.trim();
    const cleanNombre = nombre.trim();
  
    // 2. Validación de teléfono venezolano
    const regexTelefonoVzlano = /^(0414|0424|0412|0422|0416|0426|0247)\d{7}$/;
    if (!regexTelefonoVzlano.test(cleanTelefono)) {
      return res.status(400).json({ error: "El número de teléfono debe ser válido en Venezuela (ej: 04141234567)." });
    }
  
    // 3. Validación de contraseña segura
    const regexPasswordSegura = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!regexPasswordSegura.test(password_hash)) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres, incluyendo letras y números." });
    }
  
    try {
      // 4. Verificar si el usuario ya existe en la Base de Datos
      const queryCheckEmail = `SELECT id, verificado, token_expiracion FROM Usuarios WHERE email = $1;`;
      const checkResult = await pool.query(queryCheckEmail, [cleanEmail]);
  
      if (checkResult.rows.length > 0) {
        const usuarioExistente = checkResult.rows[0];
  
        if (usuarioExistente.verificado) {
          return res.status(400).json({ error: "⚠️ Este correo ya está registrado y verificado en el sistema." });
        } else {
          // 🕒 Si no está verificado pero el token sigue vigente
          const ahora = new Date();
          const expiracionToken = new Date(usuarioExistente.token_expiracion);
  
          if (expiracionToken > ahora) {
            return res.status(400).json({ error: "⚠️ Ya hay un registro en proceso para este correo y el enlace de verificación sigue vigente." });
          } else {
            // 🧹 Token expirado, limpiamos el registro anterior congelado
            await pool.query(`DELETE FROM Usuarios WHERE id = $1;`, [usuarioExistente.id]);
          }
        }
      }
  
      // 5. Hash de la contraseña
      const salt = await bcryptjs.genSalt(10);
      const hashedpassword = await bcryptjs.hash(password_hash, salt);
  
      // 6. Generar token único de verificación y tiempo de expiración (15 minutos)
      const tokenVerificacion = crypto.randomBytes(32).toString('hex');
      const fechaExpiracion = new Date();
      fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + 15);
  
      // 7. Insertar en la BD en estado CONGELADO (verificado = FALSE)
      const queryRegistro = `
        INSERT INTO Usuarios (password_hash, nombre, tipo, telefono, email, verificado, token_verificacion, token_expiracion) 
        VALUES ($1, $2, $3, $4, $5, FALSE, $6, $7) 
        RETURNING id, nombre, email, tipo;
      `;
      
      const newUserResult = await pool.query(queryRegistro, [
        hashedpassword, 
        cleanNombre, 
        tipo, 
        cleanTelefono, 
        cleanEmail, 
        tokenVerificacion, 
        fechaExpiracion
      ]);
  
      const userCreated = newUserResult.rows[0];
  
      // 8. Construir enlace de verificación dinámico
      const baseUrl = (process.env.BACKEND_URL || process.env.API_BASE_URL || '').replace(/\/$/, '');
      const linkVerificacion = `${baseUrl}/users/verificar?token=${tokenVerificacion}`;
  
      // 9. Disparar el correo de verificación en segundo plano
      try {
        enviarCorreoVerificacion(
          userCreated.email, 
          userCreated.nombre, 
          linkVerificacion, 
          userCreated.tipo
        ).catch((err) => 
          console.error("❌ Falló el envío del correo de verificación por admin:", err)
        );
      } catch (emailErr) {
        console.error("⚠️ Error síncrono al intentar invocar enviarCorreoVerificacion:", emailErr);
      }
  
      // 10. Responder éxito al panel de administración
      return res.status(201).json({ 
        success: true,
        message: `✅ Usuario registrado exitosamente. Se ha enviado un correo de verificación a ${cleanEmail} para activar su cuenta.` 
      });
  
    } catch (error) {
      console.error("❌ Error en createUserByAdmin:", error);
      return res.status(500).json({ error: "Ocurrió un error en el servidor al procesar el registro." });
    }
};




// import bcryptjs from 'bcryptjs'
// import { pool } from "../../db.js";
// import crypto from 'crypto' // 🔑 Importación nativa para generar tokens aleatorios
// import { enviarCorreoVerificacion } from '../../services/emailService.js';



// // 🔑 REGISTRAR USUARIO DESDE EL PANEL DE ADMINISTRACIÓN (CON VERIFICACIÓN POR CORREO)
// export const createUserByAdmin = async (req, res) => {
//     const { password_hash, nombre, email, telefono, tipo } = req.body;
  
//     // 1. Validar que no falten datos
//     if (!password_hash || !nombre || !telefono || !tipo || !email) {
//       return res.status(400).json({ error: "Todos los datos son requeridos, verifique." });
//     }
  
//     const cleanEmail = email.trim().toLowerCase();
//     const cleanTelefono = telefono.trim();
//     const cleanNombre = nombre.trim();
  
//     // 2. Validación de teléfono venezolano
//     const regexTelefonoVzlano = /^(0414|0424|0412|0422|0416|0426|0247)\d{7}$/;
//     if (!regexTelefonoVzlano.test(cleanTelefono)) {
//       return res.status(400).json({ error: "El número de teléfono debe ser válido en Venezuela (ej: 04141234567)." });
//     }
  
//     // 3. Validación de contraseña segura
//     const regexPasswordSegura = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
//     if (!regexPasswordSegura.test(password_hash)) {
//       return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres, incluyendo letras y números." });
//     }
  
//     try {
//       // 4. Verificar si el usuario ya existe en la Base de Datos
//       const queryCheckEmail = `SELECT id, verificado, token_expiracion FROM Usuarios WHERE email = $1;`;
//       const checkResult = await pool.query(queryCheckEmail, [cleanEmail]);
  
//       if (checkResult.rows.length > 0) {
//         const usuarioExistente = checkResult.rows[0];
  
//         if (usuarioExistente.verificado) {
//           return res.status(400).json({ error: "⚠️ Este correo ya está registrado y verificado en el sistema." });
//         } else {
//           // 🕒 Si no está verificado pero el token sigue vigente
//           const ahora = new Date();
//           const expiracionToken = new Date(usuarioExistente.token_expiracion);
  
//           if (expiracionToken > ahora) {
//             return res.status(400).json({ error: "⚠️ Ya hay un registro en proceso para este correo y el enlace de verificación sigue vigente." });
//           } else {
//             // 🧹 Token expirado, limpiamos el registro anterior congelado
//             await pool.query(`DELETE FROM Usuarios WHERE id = $1;`, [usuarioExistente.id]);
//           }
//         }
//       }
  
//       // 5. Hash de la contraseña
//       const salt = await bcryptjs.genSalt(10);
//       const hashedpassword = await bcryptjs.hash(password_hash, salt);
  
//       // 6. Generar token único de verificación y tiempo de expiración (15 minutos)
//       const tokenVerificacion = crypto.randomBytes(32).toString('hex');
//       const fechaExpiracion = new Date();
//       fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + 15);
  
//       // 7. Insertar en la BD en estado CONGELADO (verificado = FALSE)
//       const queryRegistro = `
//         INSERT INTO Usuarios (password_hash, nombre, tipo, telefono, email, verificado, token_verificacion, token_expiracion) 
//         VALUES ($1, $2, $3, $4, $5, FALSE, $6, $7) 
//         RETURNING id, nombre, email, tipo;
//       `;
      
//       const newUserResult = await pool.query(queryRegistro, [
//         hashedpassword, 
//         cleanNombre, 
//         tipo, 
//         cleanTelefono, 
//         cleanEmail, 
//         tokenVerificacion, 
//         fechaExpiracion
//       ]);
  
//       const userCreated = newUserResult.rows[0];
  
//       // Si es repartidor, dejamos creado su perfil secundario asociado (si aplica en tu esquema)
//       if (tipo === 'repartidor') {
//         await pool.query(
//           `INSERT INTO repartidores (usuario_id, codigo_conductor) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
//           [userCreated.id, `DRV-${Math.floor(100 + Math.random() * 900)}`]
//         );
//       }
  
//       // 8. Construir enlace de verificación dinámico
//       const baseUrl = (process.env.BACKEND_URL || process.env.API_BASE_URL || '').replace(/\/$/, '');
//       const linkVerificacion = `${baseUrl}/users/verificar?token=${tokenVerificacion}`;
  
//       // 9. Disparar el correo de verificación en segundo plano
//       try {
//         enviarCorreoVerificacion(
//           userCreated.email, 
//           userCreated.nombre, 
//           linkVerificacion, 
//           userCreated.tipo
//         ).catch((err) => 
//           console.error("❌ Falló el envío del correo de verificación por admin:", err)
//         );
//       } catch (emailErr) {
//         console.error("⚠️ Error síncrono al intentar invocar enviarCorreoVerificacion:", emailErr);
//       }
  
//       // 10. Responder éxito al panel de administración
//       return res.status(201).json({ 
//         success: true,
//         message: `✅ Usuario registrado exitosamente. Se ha enviado un correo de verificación a ${cleanEmail} para activar su cuenta.` 
//       });
  
//     } catch (error) {
//       console.error("❌ Error en createUserByAdmin:", error);
//       return res.status(500).json({ error: "Ocurrió un error en el servidor al procesar el registro." });
//     }
//   };