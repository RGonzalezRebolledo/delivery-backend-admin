import { pool } from "../../db.js";

export const getClientsWithWalletBalance = async (req, res) => {
    try {
        const query = `
            SELECT 
                id, 
                nombre, 
                email, 
                telefono, 
                verificado, 
                fecha_creacion,
                saldo_billetera
            FROM usuarios
            WHERE tipo = 'cliente' 
              AND saldo_billetera > 0.00
            ORDER BY saldo_billetera DESC
        `;

        const result = await pool.query(query);

        return res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error al obtener clientes con saldo en billetera:", error);
        return res.status(500).json({ error: "Error al obtener el listado de billeteras de clientes." });
    }
};