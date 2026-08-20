const express = require("express");
const router = express.Router();
const { listar } = require("../controllers/coberturaController");

// Listado publico de coberturas (reutilizable desde el registro de pacientes).
router.get("/", listar);

module.exports = router;
