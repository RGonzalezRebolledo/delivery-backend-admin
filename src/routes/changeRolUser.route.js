import { Router } from 'express';
import { cambiarClienteARepartidor, cambiarConductorACliente } from' ../controllers/changeRolUsers.controller.js';
// import { verifyAdminToken } from '../../middlewares/verifyAdminToken.js';

const routerChangeRolClients = Router();

// Endpoint para convertir un cliente a repartidor/conductor
routerChangeRolClients.put(
  '/admin/clients/:id/convertir-repartidor',
  cambiarClienteARepartidor
);

// Endpoint para convertir un repartidor/conductor a cliente
routerChangeRolClients.put(
  '/driver/convert-to-client/:id',
  cambiarConductorACliente
);

export default routerChangeRolClients;