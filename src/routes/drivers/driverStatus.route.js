
import { Router } from "express";


// Importamos los controladores (asumiendo el archivo anterior)
import { getAdminDriversStatus } from "../../controllers/drivers/driverStatus.controller"; 

const routerDriversStatus = Router();

routerDriversStatus.get('/drivers-status', getAdminDriversStatus);


export default routerDriversStatus;