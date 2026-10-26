import { pool } from "../db.js";

export const cambiarClienteARepartidor = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    // 1. Obtener datos del usuario
    const userRes = await client.query(
      'SELECT id, tipo, saldo_billetera FROM usuarios WHERE id = $1',
      [id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado.' });
    }

    const usuario = userRes.rows[0];

    if (usuario.tipo !== 'cliente') {
      return res.status(400).json({ exito: false, mensaje: 'El usuario no tiene rol de cliente.' });
    }

    // 2. Validaciones de negocio
    const saldo = parseFloat(usuario.saldo_billetera || 0);
    if (saldo > 0) {
      return res.status(400).json({
        exito: false,
        mensaje: `No se puede realizar el cambio: El cliente posee un saldo de $${saldo.toFixed(2)} en su billetera.`
      });
    }

    // Comprobar si ya existe en la tabla repartidores
    const repCheck = await client.query('SELECT id FROM repartidores WHERE usuario_id = $1', [id]);
    if (repCheck.rows.length > 0) {
      return res.status(400).json({ exito: false, mensaje: 'El usuario ya está registrado en la tabla de repartidores.' });
    }

    // Comprobar si tiene pedidos como cliente
    const pedidosCheck = await client.query('SELECT COUNT(*) FROM pedidos WHERE cliente_id = $1', [id]);
    const totalPedidos = parseInt(pedidosCheck.rows[0].count, 10);
    if (totalPedidos > 0) {
      return res.status(400).json({
        exito: false,
        mensaje: `No se puede realizar el cambio: El cliente registra ${totalPedidos} pedido(s) en su historial.`
      });
    }

    // Comprobar si tiene transacciones en billetera
    const txCheck = await client.query('SELECT COUNT(*) FROM transacciones_billetera WHERE usuario_id = $1', [id]);
    const totalTx = parseInt(txCheck.rows[0].count, 10);
    if (totalTx > 0) {
      return res.status(400).json({
        exito: false,
        mensaje: `No se puede realizar el cambio: El cliente registra ${totalTx} transacción(es) en billetera.`
      });
    }

    // 3. Cambiar únicamente el tipo de usuario a 'repartidor'
    await client.query("UPDATE usuarios SET tipo = 'repartidor' WHERE id = $1", [id]);

    return res.status(200).json({
      exito: true,
      mensaje: 'Rol actualizado exitosamente a repartidor. El usuario ha quedado pendiente por registro.'
    });

  } catch (error) {
    console.error('Error al cambiar rol a repartidor:', error);
    return res.status(500).json({ exito: false, mensaje: 'Error interno del servidor al procesar el cambio.' });
  } finally {
    client.release();
  }
};

export const cambiarConductorACliente = async (req, res) => {
  const { id } = req.params; // usuario_id
  const client = await pool.connect();

  try {
    // 1. Obtener datos del usuario
    const userRes = await client.query(
      'SELECT id, tipo, saldo_billetera FROM usuarios WHERE id = $1',
      [id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado.' });
    }

    const usuario = userRes.rows[0];

    if (usuario.tipo !== 'repartidor') {
      return res.status(400).json({ 
        exito: false, 
        mensaje: 'El usuario no posee el rol de repartidor.' 
      });
    }

    // 2. Validar Saldo en Billetera
    const saldo = parseFloat(usuario.saldo_billetera || 0);
    if (saldo > 0) {
      return res.status(400).json({
        exito: false,
        mensaje: `No se puede realizar el cambio: El usuario posee un saldo activo de $${saldo.toFixed(2)} en su billetera.`
      });
    }

    // 3. Validaciones de Historial
    // A. Pedidos asignados o realizados
    const pedidosCheck = await client.query(
      'SELECT COUNT(*) FROM pedidos WHERE cliente_id = $1 OR repartidor_id = $1',
      [id]
    );
    const totalPedidos = parseInt(pedidosCheck.rows[0].count, 10);
    if (totalPedidos > 0) {
      return res.status(400).json({
        exito: false,
        mensaje: `No se puede realizar el cambio: El usuario posee ${totalPedidos} pedido(s) asociados en su historial.`
      });
    }

    // B. Asignaciones/Entregas en repartidores_pedidos
    const asignacionesCheck = await client.query(
      'SELECT COUNT(*) FROM repartidores_pedidos WHERE repartidor_id = $1',
      [id]
    );
    const totalAsignaciones = parseInt(asignacionesCheck.rows[0].count, 10);
    if (totalAsignaciones > 0) {
      return res.status(400).json({
        exito: false,
        mensaje: `No se puede realizar el cambio: Registra ${totalAsignaciones} asignación(es) de entrega en historial.`
      });
    }

    // C. Liquidaciones
    const liquidacionesCheck = await client.query(
      'SELECT COUNT(*) FROM liquidaciones_repartidores WHERE repartidor_id = $1',
      [id]
    );
    const totalLiquidaciones = parseInt(liquidacionesCheck.rows[0].count, 10);
    if (totalLiquidaciones > 0) {
      return res.status(400).json({
        exito: false,
        mensaje: `No se puede realizar el cambio: Registra ${totalLiquidaciones} liquidación(es) en el sistema.`
      });
    }

    // D. Transacciones de Billetera
    const txCheck = await client.query(
      'SELECT COUNT(*) FROM transacciones_billetera WHERE usuario_id = $1',
      [id]
    );
    const totalTx = parseInt(txCheck.rows[0].count, 10);
    if (totalTx > 0) {
      return res.status(400).json({
        exito: false,
        mensaje: `No se puede realizar el cambio: Registra ${totalTx} transacción(es) de billetera.`
      });
    }

    // 4. Ejecutar Transacción SQL para reasignar rol y eliminar el perfil de repartidor
    await client.query('BEGIN');

    // Eliminar perfil de repartidor
    await client.query('DELETE FROM repartidores WHERE usuario_id = $1', [id]);

    // Cambiar tipo de usuario a 'cliente' y limpiar su código de conductor
    await client.query(
      "UPDATE usuarios SET tipo = 'cliente', codigo_conductor = NULL WHERE id = $1",
      [id]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      exito: true,
      mensaje: 'El conductor ha sido convertido exitosamente a cliente.'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al cambiar rol a cliente:', error);
    return res.status(500).json({ 
      exito: false, 
      mensaje: 'Error interno del servidor al procesar el cambio de rol.' 
    });
  } finally {
    client.release();
  }
};