const express = require("express");
const router = express.Router();
const { listar } = require("../controllers/auditoriaController");
const { verificarToken, verificarRol } = require("../middlewares/auth");

// Consulta de logs de auditoria: solo el rol administrador (Semana 4).
router.use(verificarToken, verificarRol("admin", "administrador"));

router.get("/", listar);

module.exports = router;
