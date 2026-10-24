process.env.TZ = "America/Caracas"; // Forza al servidor a usar la hora de Venezuela
import "dotenv/config";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pool } from "./db.js";

// --- IMPORTACIÓN DE RUTAS EXCLUSIVAS PARA ADMINISTRACIÓN ---
// import routerLoginAdmin from "./routes/loginAdmin.route.js";
// import routerCheckSesionAdmin from "./routes/checkSesionadmin.route.js";
import routerAdminDashboardStats from "./routes/dashboardAdmin.route.js";

// import routerAdminManagment from "./routes/administrator/managment/managment.route.js";
// import routerAvailableDrivers from "./routes/administrator/managment/driver/availableDrivers.route.js";
// import routerLiquidacion from "./routes/administrator/managment/liquidacionesRoutes.js";
// import routerPedidos from "./routes/administrator/administrator/pedidos.routes.js";
// import routerChangeRolClients from "./routes/administrator/administrator/changeRolUser.route.js";
// import routerAbonarWalllet from "./routes/administrator/walletAdmin.route.js";
// import routerContacDriver from "./routes/administrator/contacDriver.route.js";
// import routerClientWalletBalance from "./routes/administrator/client/clientWalletBalance.route.js";
// import routerAdminCreateUsers from "./routes/administrator/registerAdmin.route.js";
// import routerAdmin from "./routes/administrator/authAdmin.route.js";
// import routerVehicles from "./routes/administrator/typeVhicle.route.js";
// import routerServices from "./routes/administrator/typeServices.route.js";



const app = express();
app.set("trust proxy", 1); // Soluciona el warning de express-rate-limit en Railway

// --- 1. MIDDLEWARES DE PARSEO GLOBAL ---
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// --- CONFIGURACIÓN DE CORS ---
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://admin.gazzellaexpress.app",
  "https://www.admin.gazzellaexpress.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Bloqueado por CORS Admin"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);

// --- RUTA DE HEALTHCHECK PARA RAILWAY ---
app.get("/", (req, res) => {
  res
    .status(200)
    .send("🚀 Gazzella Express Backend Admin activo y seguro.");
});

// --- MONTAJE DE RUTAS DE ADMINISTRACIÓN ---
// app.use(routerLoginAdmin);
// app.use(routerCheckSesionAdmin);
app.use(routerAdminDashboardStats);

// app.use(routerAdminManagment);
// app.use(routerAvailableDrivers);
// app.use(routerLiquidacion);
// app.use(routerPedidos);
// app.use(routerChangeRolClients);
// app.use(routerAbonarWalllet);
// app.use(routerContacDriver);
// app.use(routerClientWalletBalance);
// app.use(routerAdminCreateUsers);
// app.use(routerAdmin);
// app.use(routerVehicles);
// app.use(routerServices);

// --- MANEJO DE ERRORES GLOBAL ---
app.use((err, req, res, next) => {
  console.error("🔥 Error detectado en Admin:", err.stack);
  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Error interno del servidor admin",
  });
});

// --- LEVANTAR SERVIDOR SEGURO PARA RAILWAY ---
const PORT = process.env.PORT || 4000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("--------------------------");
  console.log(`🚀 Backend Admin Gazzella corriendo en puerto ${PORT}`);
  console.log("--------------------------");
});