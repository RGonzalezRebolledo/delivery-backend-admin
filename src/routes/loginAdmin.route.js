import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validateUserAdmin } from '../controllers/login.controller';
// import { validateUserAdmin } from '../controllers/login.controller'; 

const routerLoginAdmin = Router();

// 🛡️ Limitador de tasa estricto para el login de administración (Previene Fuerza Bruta / Brute Force)
const adminLoginLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // Ventana de tiempo de 15 minutos
    max: 5, // Límite máximo de 5 intentos fallidos por dirección IP en esos 15 minutos
    standardHeaders: true, // Devuelve información del límite en las cabeceras `RateLimit-*`
    legacyHeaders: false, // Deshabilita las cabeceras `X-RateLimit-*`
    message: {
        error: "Demasiados intentos de inicio de sesión desde esta IP. Por favor, intenta de nuevo en 15 minutos."
    },
    // Opcional: Solo cuenta las peticiones que devuelven error (ej. credenciales inválidas) o todas. 
    // Por seguridad, contar todas las peticiones POST a esta ruta es lo estándar.
});

// // Ruta de login de administrador blindada con Rate Limiting
// routerLoginAdmin.post('/login/admin', adminLoginLimiter, validateUserAdmin);
routerLoginAdmin.post('/login/admin',validateUserAdmin);


export default routerLoginAdmin;


// import {Router} from 'express'
// import { validateUserAdmin } from '../../controllers/administrator/loginAdmin.controller.js';

// const routerLoginAdmin = Router();

// // verifico si el usuario esta registrado correctamente
// routerLoginAdmin.post('/login/admin',validateUserAdmin)

// export default routerLoginAdmin