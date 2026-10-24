import { Router } from "express";
import { getPanelMetrics } from "../controllers/adminPanelMetric.controller.js"; 
// import { verifyAdminToken } from "../middlewares/verifyAdminToken.js";

const routerAdminDashboardStats = Router();

// Ruta de métricas libre para pruebas
routerAdminDashboardStats.get("/panel-metrics,", (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Métricas de prueba cargadas correctamente",
      data: {
        totalDeliveries: 15,
        activeDrivers: 4,
        pendingOrders: 2
      }
    });
  });

export default routerAdminDashboardStats;

// import { Router } from "express";
// import { getPanelMetrics } from "../controllers/adminPanelMetric.controller.js"; 
// // import { verifyAdminToken } from "../middlewares/verifyAdminToken.js";

// const routerAdminDashboardStats = Router();

// // Ruta de métricas libre para pruebas
// routerAdminDashboardStats.get("/panel-metrics,", (req, res) => {
//     return res.status(200).json({
//       success: true,
//       message: "Métricas de prueba cargadas correctamente",
//       data: {
//         totalDeliveries: 15,
//         activeDrivers: 4,
//         pendingOrders: 2
//       }
//     });
//   });

// export default routerAdminDashboardStats;

