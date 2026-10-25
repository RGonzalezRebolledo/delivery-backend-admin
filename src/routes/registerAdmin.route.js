import { Router } from 'express';
import rateLimit from 'express-rate-limit'; // 🛡️ Limitador de tasa
import { createUserByAdmin } from '../controllers/registerAdmin.controller.js';
// import { verifyAdminToken } from '../middlewares/verifyAdminToken.js';

const routerAdminCreateUsers = Router();


// 🛡️ Limitador adaptado para el uso administrativo
const registerAdminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Ventana de 15 minutos
    max: 30, // Permitimos hasta 30 registros administrativos por IP en 15 min
    message: { 
        error: "Has alcanzado el límite de registros por lote. Por favor, espera unos minutos antes de continuar." 
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// 🛡️ Aplicamos primero la verificación de token y luego el limitador antes del controlador
routerAdminCreateUsers.post(
    '/users/create', 
    registerAdminLimiter, 
    createUserByAdmin
);

export default routerAdminCreateUsers;