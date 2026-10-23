// src/controllers/adminController.js
import { pool } from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// 1. LOGIN DE ADMINISTRADOR
export const validateUserAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Faltan credenciales." });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const resultUser = await pool.query(
      "SELECT id, email, password_hash, tipo, nombre FROM usuarios WHERE LOWER(email) = $1",
      [cleanEmail]
    );

    if (resultUser.rows.length === 0) {
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    const user = resultUser.rows[0];

    if (user.tipo !== "administrador" && user.tipo !== "supervisor") {
      return res.status(403).json({ error: "Acceso no autorizado." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    const rawSecret = process.env.JWT_SECRETADMIN;
    if (!rawSecret) throw new Error("FALTA JWT_SECRETADMIN");
    const secret = rawSecret.trim();

    const tokenPayload = {
      id: user.id,
      email: user.email,
      tipo: user.tipo,
      nombre: user.nombre,
    };

    const token = jwt.sign(tokenPayload, secret, { expiresIn: "8h" });

    return res.status(200).json({
      message: "Acceso concedido.",
      token: token,
      user: {
        email: user.email,
        tipo: user.tipo,
        nombre: user.nombre,
        id: user.id,
      },
    });
  } catch (error) {
    console.error("🔥 Error en login admin:", error);
    return res.status(500).json({ error: "Error en el servidor." });
  }
};
