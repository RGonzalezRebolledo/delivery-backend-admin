import { Router } from "express";
// import { verifyToken } from '../middlewares/verifyToken.js'; // 👈 Importar el middleware
import { getDrivers } from "../../controllers/drivers/driverGeneral.controller.js"; 

const routerGetDrivers = Router();

routerGetDrivers.get('/driver/getdrivers', getDrivers);

export default routerGetDrivers;