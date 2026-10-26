import { pool } from '../../db.js';

export const registerDriverInterview = async (req, res) => {
    const { 
        usuario_id, 
        telefono, 
        phone,
        documento_identidad, 
        tipo_documento, 
        tipo_vehiculo_id, 
        foto, 
        foto_vehiculo,
        tipo_conductor, // 'interno' | 'foraneo'
        foto_documento,  // URL de foto C.I / Documento
        codigo_banco,   // <--- NUEVO
        numero_cuenta   // <--- NUEVO
    } = req.body;

    const userPhone = telefono || phone;

    // 1. Validación de campos obligatorios
    if (!usuario_id || !userPhone || !documento_identidad || !tipo_vehiculo_id || !foto || !foto_vehiculo || !foto_documento) {
        return res.status(400).json({ 
            success: false,
            error: 'Faltan datos obligatorios. Asegúrese de incluir el teléfono, subir las 3 fotos y llenar todos los campos.' 
        });
    }

    // Validación opcional/estricta de longitud de cuenta si se envía
    if (numero_cuenta && String(numero_cuenta).length !== 20) {
        return res.status(400).json({
            success: false,
            error: 'El número de cuenta bancaria debe tener exactamente 20 dígitos.'
        });
    }

    const client = await pool.connect();

    try {
        // 2. Verificar que el documento de identidad no pertenezca a OTRO repartidor
        const docCheckQuery = `
            SELECT usuario_id 
            FROM repartidores 
            WHERE documento_identidad = $1 AND usuario_id != $2 
            LIMIT 1;
        `;
        const docCheckResult = await client.query(docCheckQuery, [documento_identidad, usuario_id]);

        if (docCheckResult.rows.length > 0) {
            const existingUserId = docCheckResult.rows[0].usuario_id;
            return res.status(400).json({
                success: false,
                error: `El documento de identidad ${documento_identidad} ya pertenece a otro conductor (ID de usuario: ${existingUserId}).`
            });
        }

        await client.query('BEGIN');

        // 3. Verificar si el conductor ya existe y tiene un código asignado previamente
        const existingDriverQuery = `
            SELECT codigo_conductor 
            FROM repartidores 
            WHERE usuario_id = $1;
        `;
        const existingDriverRes = await client.query(existingDriverQuery, [usuario_id]);
        
        let codigoFinal = existingDriverRes.rows[0]?.codigo_conductor || null;

        // 4. Si NO tiene código previo asignado, generamos el correlativo siguiente sin saltos
        if (!codigoFinal) {
            await client.query('LOCK TABLE repartidores IN EXCLUSIVE MODE;');

            const numQuery = `
                SELECT COALESCE(
                    MAX(CAST(NULLIF(regexp_replace(codigo_conductor, '\\D', '', 'g'), '') AS INTEGER)), 
                    0
                ) + 1 AS siguiente_num
                FROM repartidores;
            `;
            const numResult = await client.query(numQuery);
            const siguienteNumero = numResult.rows[0].siguiente_num;

            codigoFinal = `G${String(siguienteNumero).padStart(2, '0')}`;
        }

        // 5. Insertar o actualizar en 'repartidores' incluyendo los nuevos campos bancarios
        const driverQuery = `
            INSERT INTO repartidores (
                usuario_id, 
                documento_identidad, 
                tipo_documento, 
                tipo_vehiculo_id, 
                foto, 
                foto_vehiculo, 
                tipo_conductor,
                foto_documento,
                is_active, 
                is_available,
                codigo_conductor,
                codigo_banco,
                numero_cuenta
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (usuario_id) 
            DO UPDATE SET 
                documento_identidad = EXCLUDED.documento_identidad,
                tipo_documento = EXCLUDED.tipo_documento,
                tipo_vehiculo_id = EXCLUDED.tipo_vehiculo_id,
                foto = EXCLUDED.foto,
                foto_vehiculo = EXCLUDED.foto_vehiculo,
                tipo_conductor = EXCLUDED.tipo_conductor,
                foto_documento = EXCLUDED.foto_documento,
                codigo_banco = EXCLUDED.codigo_banco,
                numero_cuenta = EXCLUDED.numero_cuenta,
                is_active = 'activo',
                codigo_conductor = COALESCE(repartidores.codigo_conductor, EXCLUDED.codigo_conductor)
            RETURNING *;
        `;

        const driverValues = [
            usuario_id, 
            documento_identidad, 
            tipo_documento, 
            tipo_vehiculo_id, 
            foto, 
            foto_vehiculo, 
            tipo_conductor || 'foraneo', 
            foto_documento,
            'activo', 
            false,
            codigoFinal,
            codigo_banco || null,
            numero_cuenta || null
        ];

        const driverResult = await client.query(driverQuery, driverValues);

        // 6. Actualizar tipo, teléfono y codigo_conductor en la tabla 'usuarios'
        await client.query(
            'UPDATE usuarios SET tipo = $1, telefono = $2, codigo_conductor = $3 WHERE id = $4',
            ['repartidor', userPhone, codigoFinal, usuario_id]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Conductor registrado y activado con éxito',
            data: {
                ...driverResult.rows[0],
                codigo_conductor: codigoFinal,
                telefono: userPhone
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en registerDriverInterview:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno al procesar el registro del conductor.' 
        });
    } finally {
        client.release();
    }
};

// import { pool } from '../../db.js';

// export const registerDriverInterview = async (req, res) => {
//     const { 
//         usuario_id, 
//         telefono, 
//         phone,
//         documento_identidad, 
//         tipo_documento, 
//         tipo_vehiculo_id, 
//         foto, 
//         foto_vehiculo,
//         tipo_conductor, // 'interno' | 'foraneo'
//         foto_documento   // URL de foto C.I / Documento
//     } = req.body;

//     const userPhone = telefono || phone;

//     // 1. Validación de campos obligatorios
//     if (!usuario_id || !userPhone || !documento_identidad || !tipo_vehiculo_id || !foto || !foto_vehiculo || !foto_documento) {
//         return res.status(400).json({ 
//             success: false,
//             error: 'Faltan datos obligatorios. Asegúrese de incluir el teléfono, subir las 3 fotos y llenar todos los campos.' 
//         });
//     }

//     const client = await pool.connect();

//     try {
//         // 2. Verificar que el documento de identidad no pertenezca a OTRO repartidor
//         const docCheckQuery = `
//             SELECT usuario_id 
//             FROM repartidores 
//             WHERE documento_identidad = $1 AND usuario_id != $2 
//             LIMIT 1;
//         `;
//         const docCheckResult = await client.query(docCheckQuery, [documento_identidad, usuario_id]);

//         if (docCheckResult.rows.length > 0) {
//             const existingUserId = docCheckResult.rows[0].usuario_id;
//             return res.status(400).json({
//                 success: false,
//                 error: `El documento de identidad ${documento_identidad} ya pertenece a otro conductor (ID de usuario: ${existingUserId}).`
//             });
//         }

//         await client.query('BEGIN');

//         // 3. Verificar si el conductor ya existe y tiene un código asignado previamente
//         const existingDriverQuery = `
//             SELECT codigo_conductor 
//             FROM repartidores 
//             WHERE usuario_id = $1;
//         `;
//         const existingDriverRes = await client.query(existingDriverQuery, [usuario_id]);
        
//         let codigoFinal = existingDriverRes.rows[0]?.codigo_conductor || null;

//         // 4. Si NO tiene código previo asignado, generamos el correlativo siguiente sin saltos
//         if (!codigoFinal) {
//             // Bloqueamos la tabla para concurrencia brevemente durante la transacción
//             await client.query('LOCK TABLE repartidores IN EXCLUSIVE MODE;');

//             const numQuery = `
//                 SELECT COALESCE(
//                     MAX(CAST(NULLIF(regexp_replace(codigo_conductor, '\\D', '', 'g'), '') AS INTEGER)), 
//                     0
//                 ) + 1 AS siguiente_num
//                 FROM repartidores;
//             `;
//             const numResult = await client.query(numQuery);
//             const siguienteNumero = numResult.rows[0].siguiente_num;

//             // Formato ultra-compacto: C01, C02... C10... C99... C100
//             codigoFinal = `G${String(siguienteNumero).padStart(2, '0')}`;
//         }

//         // 5. Insertar o actualizar en 'repartidores' asignando el código generado
//         const driverQuery = `
//             INSERT INTO repartidores (
//                 usuario_id, 
//                 documento_identidad, 
//                 tipo_documento, 
//                 tipo_vehiculo_id, 
//                 foto, 
//                 foto_vehiculo, 
//                 tipo_conductor,
//                 foto_documento,
//                 is_active, 
//                 is_available,
//                 codigo_conductor
//             ) 
//             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
//             ON CONFLICT (usuario_id) 
//             DO UPDATE SET 
//                 documento_identidad = EXCLUDED.documento_identidad,
//                 tipo_documento = EXCLUDED.tipo_documento,
//                 tipo_vehiculo_id = EXCLUDED.tipo_vehiculo_id,
//                 foto = EXCLUDED.foto,
//                 foto_vehiculo = EXCLUDED.foto_vehiculo,
//                 tipo_conductor = EXCLUDED.tipo_conductor,
//                 foto_documento = EXCLUDED.foto_documento,
//                 is_active = 'activo',
//                 codigo_conductor = COALESCE(repartidores.codigo_conductor, EXCLUDED.codigo_conductor)
//             RETURNING *;
//         `;

//         const driverValues = [
//             usuario_id, 
//             documento_identidad, 
//             tipo_documento, 
//             tipo_vehiculo_id, 
//             foto, 
//             foto_vehiculo, 
//             tipo_conductor || 'foraneo', 
//             foto_documento,
//             'activo', 
//             false,
//             codigoFinal
//         ];

//         const driverResult = await client.query(driverQuery, driverValues);

//         // 6. Actualizar tipo, teléfono y codigo_conductor en la tabla 'usuarios'
//         await client.query(
//             'UPDATE usuarios SET tipo = $1, telefono = $2, codigo_conductor = $3 WHERE id = $4',
//             ['repartidor', userPhone, codigoFinal, usuario_id]
//         );

//         await client.query('COMMIT');

//         res.status(201).json({
//             success: true,
//             message: 'Conductor registrado y activado con éxito',
//             data: {
//                 ...driverResult.rows[0],
//                 codigo_conductor: codigoFinal,
//                 telefono: userPhone
//             }
//         });

//     } catch (error) {
//         await client.query('ROLLBACK');
//         console.error('Error en registerDriverInterview:', error);
//         res.status(500).json({ 
//             success: false, 
//             error: 'Error interno al procesar el registro del conductor.' 
//         });
//     } finally {
//         client.release();
//     }
// };
