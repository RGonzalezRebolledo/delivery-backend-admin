// 2. MÉTRICAS DEL PANEL
export const getPanelMetrics = async (req, res) => {
  try {
    // Consultas para tus tarjetas financieras del mes actual
    const gananciasQuery = await pool.query(`
        SELECT 
          COALESCE(SUM(tarifa_delivery_usd), 0) as total_usd_ganado,
          COALESCE(SUM(tarifa_delivery_bs), 0) as total_bs_ganado
        FROM pedidos 
        WHERE estado = 'completado' 
        AND EXTRACT(MONTH FROM fecha_creacion) = EXTRACT(MONTH FROM CURRENT_DATE)
      `);

    const pendientesQuery = await pool.query(`
        SELECT 
          COALESCE(SUM(monto_repartidor_usd), 0) as total_usd_pendiente,
          COALESCE(SUM(monto_repartidor_bs), 0) as total_bs_pendiente
        FROM pedidos 
        WHERE pagado_al_repartidor = false
      `);

    const pedidosQuery = await pool.query(`
        SELECT 
          COUNT(*) as total_pedidos,
          COUNT(CASE WHEN estado = 'completado' THEN 1 END) as completados,
          COUNT(CASE WHEN estado = 'terminado' THEN 1 END) as terminado
        FROM pedidos
        WHERE EXTRACT(MONTH FROM fecha_creacion) = EXTRACT(MONTH FROM CURRENT_DATE)
      `);

    return res.status(200).json({
      gananciasGazzella: gananciasQuery.rows[0],
      pagosPendientes: pendientesQuery.rows[0],
      pedidosMes: pedidosQuery.rows[0],
    });
  } catch (error) {
    console.error("🔥 Error al obtener métricas:", error);
    return res.status(500).json({ error: "Error al cargar las métricas." });
  }
};
