import { Router } from "express";
import { actualizarEstadoContactoDriver } from "../../controllers/drivers/contacDriver.controller.js"; 
// import { verifyAdminToken } from "../middlewares/verifyAdminToken.js";

const routerContacDriver = Router();


routerContacDriver.put('/driver/:id/contactado', actualizarEstadoContactoDriver);

export default routerContacDriver;