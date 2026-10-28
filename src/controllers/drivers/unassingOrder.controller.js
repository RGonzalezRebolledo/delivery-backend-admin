// Desvincular / Desasignar pedido desde el Panel de Administración
export const unassignOrderAdmin = async (req, res) => {
    const { pedidoId } = req.body;
    const io = req.app.get("io"); // Obtener la instancia de Socket.io configurada en app.js
  
    if (!pedidoId) {
      return res.status(400).json({ error: "El ID del pedido es obligatorio." });
    }
  
    let client;
    try {
      client = await pool.connect();
      await client.query("BEGIN");
  
      // 1. Obtener el pedido verificando que no esté completado/cancelado
      const orderRes = await client.query(
        `SELECT id, repartidor_id, estado 
           FROM pedidos 
           WHERE id = $1 AND estado IN ('asignado', 'en_camino') 
           FOR UPDATE`,
        [pedidoId]
      );
  
      if (orderRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error:
            "El servicio no está activo, ya fue finalizado o no tiene conductor asignado.",
        });
      }
  
      const { repartidor_id: driverId } = orderRes.rows[0];
  
      // 2. Reorganizar el pedido a estado 'pendiente' y limpiar el repartidor asignado
      await client.query(
        `UPDATE pedidos 
           SET estado = 'pendiente', 
               repartidor_id = NULL,
               conductores_rechazaron = array_append(COALESCE(conductores_rechazaron, '{}'), $1::INT),
               fecha_limite_confirmacion = NULL
           WHERE id = $2`,
        [driverId, pedidoId]
      );
  
      // 3. Liberar al conductor para que vuelva a estar disponible
      if (driverId) {
        await client.query(
          `UPDATE repartidores 
             SET tiene_pedido = false, is_available = true, available_since = CURRENT_TIMESTAMP 
             WHERE usuario_id = $1`,
          [driverId]
        );
      }
  
      await client.query("COMMIT");
  
      // 4. Cancelar temporizadores activos si existían
      if (activeTimeouts.has(pedidoId)) {
        clearTimeout(activeTimeouts.get(pedidoId));
        activeTimeouts.delete(pedidoId);
      }
  
      // 5. Notificar al repartidor vía Socket.io que el servicio fue reasignado
      if (io && driverId) {
        io.to(`driver_${driverId}`).emit("PEDIDO_DESASIGNADO_ADMIN", {
          pedido_id: pedidoId,
          mensaje: "El administrador ha reasignado este servicio.",
        });
  
        // Disparar nuevamente la asignación automática en segundo plano
        setTimeout(() => {
          assignPendingOrders(io);
        }, 1000);
      }
  
      return res.status(200).json({
        message: `Servicio #${pedidoId} desvinculado con éxito y liberado para nuevo conductor.`,
      });
    } catch (error) {
      if (client) {
        try {
          await client.query("ROLLBACK");
        } catch (e) {}
      }
      console.error("❌ Error en desvinculación administrativa:", error);
      return res.status(500).json({
        error: "Error interno al desvincular el servicio.",
        details: error.message,
      });
    } finally {
      if (client) client.release();
    }
  };
  