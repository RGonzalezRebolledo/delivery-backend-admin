import { Router } from "express";
// import { verifyAdminToken } from "../../middlewares/verifyAdminToken.js";
import {
  getPagosPendientes,
  getPagosEnProceso,         // 👈 Nueva función para listar lotes bloqueados
  procesarPagoMasivo,        // 👈 Tu función actual (bloquea y pasa a 'procesando')
  confirmarPagoLote,         // 👈 Nueva función para el pago definitivo y Telegram
  reversarPagoLote,          // 👈 Nueva función para regresar a pendientes
  getHistorialPagosRepartidores,
  getDetalleLoteEnProceso
} from "../../controllers/drivers/liquidacionesController.js";

const routerLiquidacion = Router();

routerLiquidacion.get("/pendientes", getPagosPendientes); // listo
routerLiquidacion.get("/procesando", getPagosEnProceso);  // listo             // 👈 Nueva ruta GET
routerLiquidacion.post("/bloquear-pago", procesarPagoMasivo); // listo         // 👈 Ruta existente (bloquea)
routerLiquidacion.post("/confirmar-lote", confirmarPagoLote); //   listo      // 👈 Nueva ruta POST (pago final)
routerLiquidacion.post("/reversar-lote", reversarPagoLote);   // listo         // 👈 Nueva ruta POST (reversar)
routerLiquidacion.get("/historial-pagos", getHistorialPagosRepartidores); // listo
routerLiquidacion.get("/lote-detalle/:numeroLote", getDetalleLoteEnProceso); // listo

export default routerLiquidacion;