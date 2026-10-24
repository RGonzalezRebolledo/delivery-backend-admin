import { Router } from "express";
import { getPanelMetrics } from "../controllers/adminPanelMetric.controller.js"; 
// import { verifyAdminToken } from "../middlewares/verifyAdminToken.js";

const routerAdminDashboardStats = Router();

// Agrupamos las rutas que comparten el mismo path
// // routerAdminDashboardStats.get("/admin/dashboard-stats", verifyAdminToken, getAdminDashboardStats);
// routerAdminDashboardStats.get("/panel-metrics", verifyAdminToken, getPanelMetrics);
routerAdminDashboardStats.get("/panel-metrics", getPanelMetrics);

export default routerAdminDashboardStats;
