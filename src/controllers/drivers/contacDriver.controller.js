import { pool } from '../../db.js';

export const actualizarEstadoContactoDriver = async (req, res) => {
  const { id } = req.params; // usuario_id
  const { contactado } = req.body; // booleano (true / false)

  const client = await pool.connect();
  try {
    const updateRes = await client.query(
      "UPDATE usuarios SET contactado = $1 WHERE id = $2 RETURNING id, contactado",
      [Boolean(contactado), id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ exito: false, mensaje: "Usuario no encontrado." });
    }

    return res.status(200).json({
      exito: true,
      mensaje: "Estado de contacto actualizado exitosamente.",
      contactado: updateRes.rows[0].contactado,
    });
  } catch (error) {
    console.error("Error al actualizar estado de contacto:", error);
    return res.status(500).json({ exito: false, mensaje: "Error interno del servidor." });
  } finally {
    client.release();
  }
};