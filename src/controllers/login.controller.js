// src/controllers/adminController.js
import { pool } from "../db.js";

// 1. LOGIN DE ADMINISTRADOR (Modo libre sin contraseña)
export const validateUserAdmin = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Falta el correo electrónico." });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    // Buscamos directamente al usuario por su correo en la base de datos
    const resultUser = await pool.query(
      "SELECT id, email, tipo, nombre FROM usuarios WHERE LOWER(email) = $1",
      [cleanEmail]
    );

    // Si no existe el usuario, creamos uno temporal o devolvemos un aviso básico,
    // pero si ya existe en tu BD te dejará pasar de inmediato:
    let user;
    if (resultUser.rows.length === 0) {
      // Opcional: si quieres permitir cualquier correo sin registrarlo previamente,
      // puedes asignarle datos genéricos de admin, o requerir que al menos exista:
      return res
        .status(404)
        .json({ error: "Usuario no encontrado en la base de datos." });
    } else {
      user = resultUser.rows[0];
    }

    // Devolvemos el éxito directamente sin tokens ni bcrypt
    return res.status(200).json({
      message: "Acceso libre concedido.",
      token: "token-falso-libre-de-prueba", // Un texto plano por si tu frontend lo lee
      user: {
        id: user.id,
        email: user.email,
        tipo: user.tipo,
        nombre: user.nombre,
      },
    });
  } catch (error) {
    console.error("🔥 Error en login admin libre:", error);
    return res.status(500).json({ error: "Error en el servidor." });
  }
};
