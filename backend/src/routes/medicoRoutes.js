const express = require("express");
const router = express.Router();
const { listar } = require("../controllers/medicoController");
const { verificarToken } = require("../middlewares/auth");

// Listado de medicos con especialidades: disponible para cualquier usuario
// con sesion (operador, medico y paciente lo usan).
router.get("/", verificarToken, listar);

module.exports = router;
