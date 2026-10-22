const express = require("express");
const router = express.Router();
const {
  turnosPorEspecialidad,
  turnosPorSede,
  rankingMedicos,
  tasaCancelacion,
} = require("../controllers/reporteController");
const { verificarToken, verificarRol } = require("../middlewares/auth");

// Reportes y estadisticas: solo el rol administrador (Semana 4).
router.use(verificarToken, verificarRol("admin", "administrador"));

router.get("/turnos-por-especialidad", turnosPorEspecialidad);
router.get("/turnos-por-sede", turnosPorSede);
router.get("/ranking-medicos", rankingMedicos);
router.get("/tasa-cancelacion", tasaCancelacion);

module.exports = router;
