const express = require("express");
const router = express.Router();
const { buscar, actualizarMisDatos } = require("../controllers/pacienteController");
const { verificarToken, verificarRol } = require("../middlewares/auth");

router.use(verificarToken);

// Busqueda de pacientes: operador, medico y administrador.
router.get("/", verificarRol("operador", "medico", "admin", "administrador"), buscar);

// El paciente actualiza sus propios datos editables.
router.put("/mis-datos", verificarRol("paciente"), actualizarMisDatos);

module.exports = router;
