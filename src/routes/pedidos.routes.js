// routes/pedidosRoutes.js
import { Router } from 'express';
import { getServiciosRealizados } from '../controllers/pedidos.controller.js'; 
// import { verifyAdminToken } from '../../middlewares/verifyAdminToken.js';

const routerPedidos = Router();

// Endpoint para obtener la lista de servicios realizados
routerPedidos.get('/servicios-realizados', getServiciosRealizados);

export default routerPedidos;