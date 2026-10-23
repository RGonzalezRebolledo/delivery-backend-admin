export const checkSesionAdmin = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        res.status(200).json({ 
            success: true,
            message: "Sesión de administrador activa.",
            token: token,
            user: {  // O admin, según lo que espere tu frontend
                id: req.userId,       // 👈 Corregido a userId
                tipo: req.userTipo,   // 👈 Corregido a userTipo (o rol, pero unificado)
                nombre: req.userName
            }
        });
    } catch (error) {
        console.error("Error en checkSesionAdmin:", error);
        res.status(500).json({ error: "Error al verificar la sesión de administrador" });
    }
};

