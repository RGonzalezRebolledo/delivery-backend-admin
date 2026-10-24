
import { Router } from "express";

// Importamos los controladores (asumiendo el archivo anterior)
import { getAdminClients } from "../../controllers/cliente/clientList.controller.js"; 

const routerClientList = Router();

// 1. Obtener todos los usuarios tipo 'cliente'
// GET /api/admin/clients
routerClientList.get('/admin/clients', getAdminClients);

// // 2. Obtener pedidos que no han finalizado
// // GET /api/admin/active-orders
// routerAdminManagment.get('/admin/active-orders', verifyAdminToken, getAdminActiveOrders);

// // 3. Monitor de repartidores (disponibilidad y pedidos actuales)
// // GET /api/admin/drivers-status
// routerAdminManagment.get('/admin/drivers-status', verifyAdminToken, getAdminDriversStatus);

// // desvincular servicio a conductor
// routerAdminManagment.post("/admin/unassign-order", verifyAdminToken, unassignOrderAdmin);

export default routerClientList;