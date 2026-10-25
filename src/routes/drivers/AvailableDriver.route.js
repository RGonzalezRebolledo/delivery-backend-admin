import { Router } from "express";
// import { verifyAdminToken } from '../../../middlewares/verifyAdminToken.js';
import { getAvailableDrivers } from "../../controllers/drivers/driverAvailableDrivers.controller";


const routerAvailableDrivers = Router();

routerAvailableDrivers.get('/drivers/available', getAvailableDrivers );

export default routerAvailableDrivers;