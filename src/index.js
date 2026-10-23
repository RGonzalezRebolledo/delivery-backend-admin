// src/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { validateUserAdmin} from "./controllers/adminController.js";
import { getPanelMetrics } from "./controllers/adminPanelMetric.controller.js";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Rutas
app.post("/login/admin", validateUserAdmin);
app.get("/panel-metrics", verifyAdminToken, getPanelMetrics);

app.get("/", (req, res) => {
  res.send("Backend Admin Gazzella Express activo 🚀");
});

app.listen(PORT, () => {
  console.log(`Servidor Admin corriendo en el puerto ${PORT}`);
});