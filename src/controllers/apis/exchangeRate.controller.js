
import { pool } from '../../db.js';

export const getBcvExchangeRate = async (req, res) => {
    try {
        // Consultamos la última tasa vigente guardada
        const result = await pool.query(
            'SELECT rate, updated_at FROM exchange_rates ORDER BY updated_at DESC, id DESC LIMIT 1'
        );

        if (result.rows.length > 0) {
            const data = result.rows[0];
            return res.status(200).json({
                currency: 'USD',
                rate: parseFloat(data.rate),
                source: 'BCV (Cache Interno)',
                last_updated: data.updated_at
            });
        }

        return res.status(404).json({ error: 'No hay tasas registradas aún.' });

    } catch (error) {
        console.error("Error al obtener tasa local:", error.message);
        return res.status(500).json({ error: 'Error al consultar la base de datos.' });
    }
};

// import {pool} from '../../db.js';

// export const getBcvExchangeRate = async (req, res) => {
//     try {
//         // Consultamos el último registro insertado en la base de datos
//         const result = await pool.query(
//             'SELECT rate, updated_at FROM exchange_rates ORDER BY updated_at DESC LIMIT 1'
//         );

//         if (result.rows.length > 0) {
//             const data = result.rows[0];
//             return res.status(200).json({
//                 currency: 'USD',
//                 rate: parseFloat(data.rate),
//                 source: 'BCV (Cache Interno)',
//                 last_updated: data.updated_at
//             });
//         }

//         return res.status(404).json({ error: 'No hay tasas registradas aún.' });

//     } catch (error) {
//         console.error("Error al obtener tasa local:", error.message);
//         return res.status(500).json({ error: 'Error al consultar la base de datos.' });
//     }
// };

