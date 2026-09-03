const express = require("express");
const router = express.Router();
const { registrar, consultarPorPaciente } = require("../controllers/historialController");
const { verificarToken, verificarRol } = require("../middlewares/auth");

router.use(verificarToken);

// El medico registra el historial de un turno que atendio.
router.post("/", verificarRol("medico"), registrar);

// Consulta del historial de un paciente (paciente propio / medico lo que atendio).
router.get("/paciente/:id_paciente", verificarRol("paciente", "medico"), consultarPorPaciente);

module.exports = router;
