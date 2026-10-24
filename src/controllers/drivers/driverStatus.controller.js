// 3. Listado de Repartidores Activos y su pedido actual

import { pool } from "../../db.js";
export const getAdminDriversStatus = async (req, res) => {
    try {
      const result = await pool.query(`
              SELECT 
                  u.nombre, u.telefono, r.is_available, r.tiene_pedido,
                  tv.descript as vehiculo,
                  (SELECT p.id FROM pedidos p 
                   WHERE p.repartidor_id = u.id 
                   AND p.estado IN ('asignado', 'en_camino') 
                   LIMIT 1) as pedido_actual_id
              FROM repartidores r
              JOIN usuarios u ON r.usuario_id = u.id
              LEFT JOIN tipos_vehiculos tv ON r.tipo_vehiculo_id = tv.id
              WHERE r.is_active = 'activo'
              ORDER BY r.tiene_pedido DESC, u.nombre ASC
          `);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };