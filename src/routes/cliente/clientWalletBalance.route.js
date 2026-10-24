import { Router } from 'express';
import { getClientsWithWalletBalance } from '../../controllers/cliente/clientWalletBalance.controller.js';
// import { verifyAdminToken } from '../../middlewares/verifyAdminToken.js';

const routerClientWalletBalance = Router();

// Endpoint protegido para obtener clientes con saldo activo en la billetera
// routerClientWalletBalance.get('/admin/clients-wallet', verifyAdminToken, getClientsWithWalletBalance);
routerClientWalletBalance.get('/admin/clients-wallet', getClientsWithWalletBalance);
export default routerClientWalletBalance;