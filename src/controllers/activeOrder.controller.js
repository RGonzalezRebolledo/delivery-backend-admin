
import { pool } from "../db.js";

export const getAdminActiveOrders = async (req, res) => {
    try {
      const result = await pool.query(`
              SELECT 
                  p.id, 
                  p.estado, 
                  p.total, 
                  p.total_dolar, 
                  p.fecha_pedido,
                  p.fecha_limite_confirmacion,
                  COALESCE(cardinality(p.conductores_rechazaron), 0) AS total_rechazos,
                  p.tipo_vehiculo_id,
                  tv.descript as tipo_vehiculo,
                  u_cli.nombre as cliente_nombre,
                  u_rep.nombre as repartidor_nombre,
                  r.codigo_conductor,
                  dir_o.calle as origen, 
                  dir_d.calle as destino
              FROM pedidos p
              JOIN usuarios u_cli ON p.cliente_id = u_cli.id
              LEFT JOIN usuarios u_rep ON p.repartidor_id = u_rep.id
              LEFT JOIN repartidores r ON p.repartidor_id = r.usuario_id
              LEFT JOIN tipos_vehiculos tv ON p.tipo_vehiculo_id = tv.id
              JOIN direcciones dir_o ON p.direccion_origen_id = dir_o.id
              JOIN direcciones dir_d ON p.direccion_destino_id = dir_d.id
              WHERE p.estado NOT IN ('finalizado', 'entregado')
              ORDER BY p.fecha_pedido DESC
          `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error en getAdminActiveOrders:", error);
      res.status(500).json({ error: error.message });
    }
  };