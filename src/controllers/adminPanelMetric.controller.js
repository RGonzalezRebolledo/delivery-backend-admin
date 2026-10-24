import { pool } from "../db.js";

// 2. MÉTRICAS DEL PANEL
export const getPanelMetrics = async (req, res) => {
  try {
    // Consultas adaptadas a las columnas y estados reales de la tabla pedidos
    const gananciasQuery = await pool.query(`
        SELECT 
          COALESCE(SUM(total_dolar), 0) as total_usd_ganado,
          COALESCE(SUM(total), 0) as total_bs_ganado
        FROM pedidos 
        WHERE estado = 'finalizado' 
        AND EXTRACT(MONTH FROM fecha_pedido) = EXTRACT(MONTH FROM CURRENT_DATE)
      `);

    const pendientesQuery = await pool.query(`
        SELECT 
          COALESCE(SUM(total_dolar), 0) as total_usd_pendiente,
          COALESCE(SUM(total), 0) as total_bs_pendiente
        FROM pedidos 
        WHERE pago_confirmado = false
      `);

    const pedidosQuery = await pool.query(`
        SELECT 
          COUNT(*) as total_pedidos,
          COUNT(CASE WHEN estado = 'entregado' THEN 1 END) as entregados,
          COUNT(CASE WHEN estado = 'finalizado' THEN 1 END) as finalizados
        FROM pedidos
        WHERE EXTRACT(MONTH FROM fecha_pedido) = EXTRACT(MONTH FROM CURRENT_DATE)
      `);

    return res.status(200).json({
      gananciasGazzella: gananciasQuery.rows[0],
      pagosPendientes: pendientesQuery.rows[0],
      pedidosMes: pedidosQuery.rows[0],
    });
  } catch (error) {
    console.error("🔥 Error al obtener métricas:", error);
    return res.status(500).json({ error: error.message });
  }
};