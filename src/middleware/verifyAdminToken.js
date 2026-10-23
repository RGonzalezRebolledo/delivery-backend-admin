// src/middleware/verifyAdminToken.js
import jwt from "jsonwebtoken";

export const verifyAdminToken = (req, res, next) => {
  let token = null;

  if (req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Acceso administrativo denegado. Token no proporcionado." });
  }

  try {
    const rawSecret = process.env.JWT_SECRETADMIN;
    if (!rawSecret) throw new Error("FALTA JWT_SECRETADMIN");
    const secret = rawSecret.trim();
    
    const decoded = jwt.verify(token, secret);

    if (decoded.tipo !== "administrador" && decoded.tipo !== "supervisor") {
      return res.status(403).json({ message: "No tienes permisos de administración." });
    }

    req.userId = decoded.id;
    req.userTipo = decoded.tipo;
    req.userName = decoded.nombre;
    
    next();
  } catch (err) {
    console.error("❌ Error JWT Admin detallado:", err.message);
    return res.status(403).json({ message: "Sesión administrativa expirada o inválida." });
  }
};