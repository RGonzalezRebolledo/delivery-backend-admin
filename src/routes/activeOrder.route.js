
import { Router } from "express";


// Importamos los controladores (asumiendo el archivo anterior)
import { getAdminActiveOrders } from "../controllers/activeOrder.controller.js"; 

const routerActiveOrder = Router();
// --- RUTAS DEL MÓDULO ADMINISTRATIVO ---

// 2. Obtener pedidos que no han finalizado
// GET /api/admin/active-orders
routerActiveOrder.get('/admin/active-orders', getAdminActiveOrders);



export default routerActiveOrder;