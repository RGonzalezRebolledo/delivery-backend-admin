
import { Router } from "express";
import { getServices, createService } from "../controllers/typeService.controller.js"
// import { verifyAdminToken } from "../middlewares/verifyAdminToken.js";

const routerServices  = Router();


// routerServices.route("/utils/service")
routerServices.route(["/utils/service", "/utils/services"])
  .get( getServices)
  .post( createService);

export default routerServices;
