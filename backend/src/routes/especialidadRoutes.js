const express = require("express");
const router = express.Router();
const { listar, crear, modificar, eliminar } = require("../controllers/especialidadController");
const { verificarToken, verificarRol } = require("../middlewares/auth");
const { auditar } = require("../middlewares/auditoria");

// Listado de especialidades: disponible para cualquier usuario con sesion.
router.get("/", verificarToken, listar);

// Alta/baja/modificacion: solo el rol administrador, con auditoria automatica.
router.post("/", verificarToken, verificarRol("admin", "administrador"), auditar("especialidad"), crear);
router.put("/:id", verificarToken, verificarRol("admin", "administrador"), auditar("especialidad"), modificar);
router.delete("/:id", verificarToken, verificarRol("admin", "administrador"), auditar("especialidad"), eliminar);

module.exports = router;
