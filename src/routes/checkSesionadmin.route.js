import { Router } from "express"
import { checkSesionAdmin } from "../middlewares/checkSesionAdmin.js"; 
import { verifyAdminToken } from "../middlewares/verifyAdminToken.js"; 

const routerCheckSesionAdmin = Router();
routerCheckSesionAdmin.get('/admin/check-session', verifyAdminToken,checkSesionAdmin);

export default routerCheckSesionAdmin;