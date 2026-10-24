
import { Router } from "express";
import { 
  getVehicles, 
  // createVehicle 
} from "../controllers/typeVehicle.controller.js"
// import { verifyAdminToken } from "../middlewares/verifyAdminToken.js";

const routerVehicles = Router();

// Cambia esto:
// routerVehicles.route("/utils/vehicle") // Definimos la ruta limpia
routerVehicles.route(["/utils/vehicle", "/utils/vehicles"])  
.get(getVehicles)
    // El middleware va dentro del método
  // .post(verifyAdminToken, createVehicle);
export default routerVehicles;




// import { Router } from "express";
// import { 
//   getVehicles, 
//   createVehicle 
// } from "../../controllers/administrator/config/typeVehicle.controller.js";
// import { verifyToken } from "../middlewares/verifyToken.js";

// const routerVehicles  = Router();

// // Agrupamos las rutas que comparten el mismo path
// routerVehicles .route("/utils/vehicle", verifyToken,)
//   .get(getVehicles)
//   .post(createVehicle);

// export default routerVehicles;
