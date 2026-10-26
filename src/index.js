process.env.TZ = "America/Caracas"; // Forza al servidor a usar la hora de Venezuela
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";

// --- IMPORTACIÓN DE RUTAS EXCLUSIVAS PARA ADMINISTRACIÓN ---
import routerLoginAdmin from "./routes/loginAdmin.route.js";
// import routerCheckSesionAdmin from "./routes/checkSesionadmin.route.js";
import routerAdminDashboardStats from "./routes/dashboardAdmin.route.js";
import routerClientList from "./routes/cliente/clienteList.route.js";
import routerActiveOrder from "./routes/activeOrder.route.js";
import routerClientWalletBalance from "./routes/cliente/clientWalletBalance.route.js";
import routerPedidos from "./routes/pedidos.routes.js";
import routerDriversStatus from "./routes/drivers/driverStatus.route.js";
import routerGetDrivers from "./routes/drivers/driverGeneral.route.js";
import routerContacDriver from "./routes/drivers/contacDriver.route.js";
import routerVehicles from "./routes/typeVhicle.route.js";
import routerAvailableDrivers from "./routes/drivers/AvailableDriver.route.js";
import routerLiquidacion from "./routes/drivers/liquidacionesRoutes.js";
import routerServices from "./routes/typeServices.route.js";
import routerAdminCreateUsers from "./routes/registerAdmin.route.js";
import routerChangeRolClients from "./routes/changeRolUser.route.js";
import routerDriverRegisterModal from "./routes/drivers/driverRegisterModal.route.js";
import routerExchangeRate from "./routes/exchangeRate.route.js";




const app = express();
app.set("trust proxy", 1); // Soluciona el warning de express-rate-limit en Railway

// --- CREACIÓN DEL SERVIDOR HTTP PARA SOPORTAR SOCKET.IO ---
const httpServer = createServer(app);

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

// --- CONFIGURACIÓN DE SOCKET.IO PARA EL ADMIN ---
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS de Socket Admin no permitido"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 30000,
  pingInterval: 15000,
  connectTimeout: 45000,
  allowEIO3: true,
});

// Hacemos accesible `io` a través de app por si algún controlador lo requiere
app.set("socketio", io);

// --- GESTIÓN DE EVENTOS SOCKET.IO EN EL ADMIN ---
io.on("connection", (socket) => {
  console.log(
    `⚡ Panel Admin - Dispositivo conectado vía Socket: ${socket.id}`
  );

  // Canal para unirse a seguimiento de pedidos o salas del admin
  socket.on("join_order_room", (pedido_id) => {
    if (!pedido_id) return;
    const room = `order_${pedido_id}`;
    if (!socket.rooms.has(room)) {
      socket.join(room);
      console.log(`📦 Admin unido al canal del pedido: ${room}`);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`❌ Conexión admin cerrada (${socket.id}):`, reason);
  });
});

// --- RUTA DE HEALTHCHECK PARA RAILWAY ---
app.get("/", (req, res) => {
  res.status(200).send("🚀 Gazzella Express Backend Admin activo y seguro.");
});

// --- MONTAJE DE RUTAS DE ADMINISTRACIÓN ---
app.use(routerLoginAdmin);
app.use(routerClientList);
app.use(routerActiveOrder);
app.use(routerAdminDashboardStats);
app.use(routerClientWalletBalance);
app.use(routerPedidos); // peiddos realizados en la plataforma
app.use(routerDriversStatus); // conductores y servicios
app.use(routerGetDrivers); // lista de conductores no registrados
app.use(routerContacDriver); // check para indicar que el conductor fue contactado
app.use(routerVehicles); // obtener y crear vehiculos
app.use(routerServices); // obtener y crear servicios
app.use(routerAvailableDrivers); // conductores activos
app.use(routerLiquidacion); // conductores activos
app.use(routerAdminCreateUsers) // creo usuario
app.use(routerChangeRolClients) // cambiar roles del cliente y conductor
app.use(routerDriverRegisterModal) // modificar, suspender y activar conductor
app.use(routerExchangeRate) // dolar actual del sistema


// --- MANEJO DE ERRORES GLOBAL ---
app.use((err, req, res, next) => {
  console.error("🔥 Error detectado en Admin:", err.stack);
  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Error interno del servidor admin",
  });
});

// --- LEVANTAR SERVIDOR SEGURO USANDO HTTPSERVER (NECESARIO PARA SOCKET.IO) ---
const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log("--------------------------");
  console.log(`🚀 Backend Admin Gazzella corriendo en puerto ${PORT}`);
  console.log("--------------------------");
});

// process.env.TZ = "America/Caracas"; // Forza al servidor a usar la hora de Venezuela
// import "dotenv/config";
// import express from "express";
// import morgan from "morgan";
// import cors from "cors";
// import cookieParser from "cookie-parser";
// import { pool } from "./db.js";

// // --- IMPORTACIÓN DE RUTAS EXCLUSIVAS PARA ADMINISTRACIÓN ---
//  import routerLoginAdmin from "./routes/loginAdmin.route.js";
// // import routerCheckSesionAdmin from "./routes/checkSesionadmin.route.js";
// import routerAdminDashboardStats from "./routes/dashboardAdmin.route.js";
// import routerClientList from "./routes/cliente/clienteList.route.js";
// import routerActiveOrder from "./routes/activeOrder.route.js";
// import routerClientWalletBalance from "./routes/cliente/clientWalletBalance.route.js";

// const app = express();
// app.set("trust proxy", 1); // Soluciona el warning de express-rate-limit en Railway

// // --- 1. MIDDLEWARES DE PARSEO GLOBAL ---
// app.use(morgan("dev"));
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());

// // --- CONFIGURACIÓN DE CORS ---
// const allowedOrigins = [
//   "http://localhost:5173",
//   "http://localhost:5174",
//   "https://admin.gazzellaexpress.app",
//   "https://www.admin.gazzellaexpress.app",
// ];

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         callback(new Error("Bloqueado por CORS Admin"));
//       }
//     },
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization", "Accept"],
//   })
// );

// // --- RUTA DE HEALTHCHECK PARA RAILWAY ---
// app.get("/", (req, res) => {
//   res
//     .status(200)
//     .send("🚀 Gazzella Express Backend Admin activo y seguro.");
// });

// // --- MONTAJE DE RUTAS DE ADMINISTRACIÓN ---
//  app.use(routerLoginAdmin);
//  app.use(routerClientList)
// app.use(routerActiveOrder);
// app.use(routerAdminDashboardStats);

// app.use(routerClientWalletBalance);

// // --- MANEJO DE ERRORES GLOBAL ---
// app.use((err, req, res, next) => {
//   console.error("🔥 Error detectado en Admin:", err.stack);
//   res.status(err.status || 500).json({
//     status: "error",
//     message: err.message || "Error interno del servidor admin",
//   });
// });

// // --- LEVANTAR SERVIDOR SEGURO PARA RAILWAY ---
// const PORT = process.env.PORT || 4000;

// app.listen(PORT, "0.0.0.0", () => {
//   console.log("--------------------------");
//   console.log(`🚀 Backend Admin Gazzella corriendo en puerto ${PORT}`);
//   console.log("--------------------------");
// });
