// import { Router } from 'express';
// import { logoutAdmin } from '../../controllers/administrator/authAdmin.controller.js';  
// import { verifyAdminToken } from '../middlewares/verifyAdminToken.js';  // 👈 Solo el middleware aquí
// import { checkSesionAdmin } from '../middlewares/checkSesionAdmin.js'; 
// const routerAdmin = Router();

// // 🔒 Logout de Administrador
// routerAdmin.post('/logout/admin', verifyAdminToken, logoutAdmin); 

// // 🛡️ Verificar sesión de Admin al cargar/actualizar la app (F5)
// routerAdmin.get('/admin/check-session', verifyAdminToken, checkSesionAdmin);

// export default routerAdmin;

import { Router } from 'express';
import { logoutAdmin } from '../../controllers/administrator/authAdmin.controller.js';  
// import { verifyAdminToken } from '../middlewares/verifyAdminToken.js';  // 👈 Solo el middleware aquí
import { checkSesionAdmin } from '../middlewares/checkSesionAdmin.js'; 
const routerAdmin = Router();

// 🔒 Logout de Administrador
routerAdmin.post('/logout/admin', logoutAdmin); 

// 🛡️ Verificar sesión de Admin al cargar/actualizar la app (F5)
routerAdmin.get('/admin/check-session',checkSesionAdmin);

export default routerAdmin;