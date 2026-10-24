import { pool } from "../../db.js";
// 1. Listado de Clientes
export const getAdminClients = async (req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    try {
      const result = await pool.query(`
              SELECT 
                  id, 
                  nombre, 
                  email, 
                  telefono, 
                  fecha_creacion, 
                  verificado AS verificado -- <--- Alias explícito
              FROM usuarios 
              WHERE tipo = 'cliente' 
              ORDER BY fecha_creacion DESC
          `);
  
      // OPCIONAL: Pon este console.log para verificar la respuesta real en tu terminal
      console.log("Ejemplo de cliente desde la BD:", result.rows[0]);
  
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };