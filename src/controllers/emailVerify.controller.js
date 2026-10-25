// 📬 ENDPOINT: VALIDA EL CLICK DEL CORREO Y ACTIVA LA CUENTA
export const verifyEmail = async (req, res) => {
    const { token } = req.query;
  
    if (!token || typeof token !== 'string') {
      return res.status(400).send("<h1>⚠️ Enlace inválido: Token ausente o incorrecto.</h1>");
    }
  
    try {
      // 1. Buscar usuario y evaluar expiración directamente en PostgreSQL
      const queryBuscar = `
        SELECT id, (token_expiracion < NOW()) AS esta_expirado 
        FROM Usuarios 
        WHERE token_verificacion = $1 AND verificado = FALSE;
      `;
      const result = await pool.query(queryBuscar, [token]);
  
      if (result.rowCount === 0) {
        return res.status(400).send("<h1>⚠️ El enlace es inválido o el correo ya fue verificado previamente.</h1>");
      }
  
      const usuario = result.rows[0];
  
      if (usuario.esta_expirado) {
        return res.status(400).send("<h1>⏳ El enlace ha expirado (límite de 15 minutos). Por favor, regístrate nuevamente.</h1>");
      }
  
      // 2. Activar usuario y limpiar tokens
      const queryActivar = `
        UPDATE Usuarios 
        SET verificado = TRUE, token_verificacion = NULL, token_expiracion = NULL 
        WHERE id = $1;
      `;
      await pool.query(queryActivar, [usuario.id]);
  
      // 3. Procesar URL de redirección usando la variable de entorno base
      let rawFrontendUrl = process.env.FRONTEND_URL_PROD || process.env.FRONTEND_URL || 'gazzellaexpress.app';
  
      if (!rawFrontendUrl.startsWith('http://') && !rawFrontendUrl.startsWith('https://')) {
        rawFrontendUrl = `https://${rawFrontendUrl}`;
      }
  
      const cleanFrontendUrl = rawFrontendUrl.replace(/\/$/, '');
      
      return res.redirect(`${cleanFrontendUrl}/?verificado=true`);
  
    } catch (error) {
      console.error("❌ Error en verifyEmail:", error);
      return res.status(500).send("<h1>❌ Error interno del servidor al intentar verificar tu cuenta.</h1>");
    }
  }; 