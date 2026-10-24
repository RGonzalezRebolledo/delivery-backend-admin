import { pool } from '../../db.js';

export const getDrivers = async (req, res) => {
    try {
        const query = `
        SELECT 
            u.id AS usuario_id, 
            u.nombre, 
            u.email,
            u.telefono,
            u.fecha_creacion,
            u.verificado,
            u.contactado,
            COALESCE(r.codigo_conductor, u.codigo_conductor) AS codigo_conductor, -- 👈 AGREGADO: Código único del conductor
            r.id AS repartidor_id,
            COALESCE(r.is_active, 'pendiente') AS is_active,
            r.documento_identidad,
            r.tipo_documento,
            r.tipo_conductor,   -- Necesario para el selector (interno/foraneo)
            r.foto,
            r.foto_vehiculo,
            r.foto_documento,   -- Necesario para renderizar la foto C.I / Doc
            r.codigo_banco,   -- 👈 AGREGADO: Código del banco emisor
            r.numero_cuenta,  -- 👈 AGREGADO: Número de cuenta (20 dígitos)
            r.tipo_vehiculo_id,
            tv.descript AS tipo_vehiculo
        FROM usuarios u
        LEFT JOIN repartidores r ON u.id = r.usuario_id
        LEFT JOIN tipos_vehiculos tv ON r.tipo_vehiculo_id = tv.id
        WHERE u.tipo = 'repartidor'
        ORDER BY 
            is_active ASC,
            u.nombre ASC
    `;
        
        const result = await pool.query(query);
        res.json(result.rows);

    } catch (err) {
        console.error("🔥 ERROR SQL EN GETDRIVERS:", err.message);
        res.status(500).json({ 
            error: "Error al obtener conductores ordenados", 
            details: err.message 
        });
    }
};