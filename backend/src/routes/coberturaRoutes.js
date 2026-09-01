const express = require("express");
const router = express.Router();
const { listar, crear, modificar, eliminar } = require("../controllers/coberturaController");
const { verificarToken, verificarRol } = require("../middlewares/auth");
const { auditar } = require("../middlewares/auditoria");

// Listado publico de coberturas (reutilizable desde el registro de pacientes).
router.get("/", listar);

// CRUD de coberturas: solo el rol administrador (Semana 2). La auditoria (Semana 4)
// registra automaticamente cada alta/baja/modificacion.
router.post("/", verificarToken, verificarRol("admin", "administrador"), auditar("cobertura"), crear);
router.put("/:id", verificarToken, verificarRol("admin", "administrador"), auditar("cobertura"), modificar);
router.delete("/:id", verificarToken, verificarRol("admin", "administrador"), auditar("cobertura"), eliminar);

module.exports = router;
