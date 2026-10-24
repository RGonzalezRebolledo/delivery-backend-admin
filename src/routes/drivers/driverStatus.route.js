
import { Router } from "express";


// Importamos los controladores (asumiendo el archivo anterior)
import { getAdminDriversStatus } from "../../controllers/drivers/driverStatus.controller.js"; 

const routerDriversStatus = Router();

routerDriversStatus.get('/drivers-status', getAdminDriversStatus);


export default routerDriversStatus;