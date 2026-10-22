const express = require("express");
const router = express.Router();
const { listar, crear, modificar, eliminar } = require("../controllers/sedeController");
const { verificarToken, verificarRol } = require("../middlewares/auth");
const { auditar } = require("../middlewares/auditoria");

// Listado de sedes: disponible para cualquier usuario con sesion (lo usan
// operador, medico y paciente para elegir opciones).
router.get("/", verificarToken, listar);

// Alta/baja/modificacion: solo el rol administrador, con auditoria automatica.
router.post("/", verificarToken, verificarRol("admin", "administrador"), auditar("sede"), crear);
router.put("/:id", verificarToken, verificarRol("admin", "administrador"), auditar("sede"), modificar);
router.delete("/:id", verificarToken, verificarRol("admin", "administrador"), auditar("sede"), eliminar);

module.exports = router;
