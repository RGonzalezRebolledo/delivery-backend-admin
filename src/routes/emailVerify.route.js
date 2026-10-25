import { Router } from 'express';
import rateLimit from 'express-rate-limit'; // 🛡️ Importamos el limitador de tasa
import { 
    // createUser, 
    // getAllUsers, 
    // updateUser, 
    verifyEmail, 

} from '../controllers/emailVerify.controller.js';
// import { verifyToken } from './middlewares/verifyToken.js';

const routerVerifyEmail = Router();

// 🛡️ CREAMOS UN RATE LIMITER ESTRICTO PARA EL REGISTRO
// Esto frena en seco a cualquier bot que intente hacer spam masivo de registros
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Ventana de 15 minutos
    max: 5, // Máximo 5 intentos de registro por IP en esos 15 minutos
    message: { 
        error: "Demasiados intentos de registro desde esta red. Por favor, intente nuevamente más tarde." 
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// 🛡️ Aplicamos el limitador antes del controlador de creación de usuarios
// routerUsers.post('/users', registerLimiter, createUser);

routerVerifyEmail.get('/users/verificar', verifyEmail);


export default routerVerifyEmail;