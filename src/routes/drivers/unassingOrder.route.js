
import { Router } from "express";
// Importamos los controladores (asumiendo el archivo anterior)
import {  unassignOrderAdmin

 } from '../../controllers/drivers/unassingOrder.controller.js';
// Middleware de autenticación (ejemplo de lo que deberías tener)
// import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';
// import { verifyAdminToken } from "../../middlewares/verifyAdminToken.js";
const routerUnassingOrder = Router();


// desvincular servicio a conductor
routerAdminManagment.post("/admin/unassign-order", unassignOrderAdmin);

export default routerUnassingOrder;