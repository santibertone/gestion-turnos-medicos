const express = require("express");
const router = express.Router();
const { fechas, horarios } = require("../controllers/disponibilidadController");
const { verificarToken, verificarRol } = require("../middlewares/auth");

// Consulta de disponibilidad para solicitar turnos: paciente y operador.
router.use(verificarToken, verificarRol("paciente", "operador"));

router.get("/fechas", fechas);
router.get("/horarios", horarios);

module.exports = router;
