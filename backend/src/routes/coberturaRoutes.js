const express = require("express");
const router = express.Router();
const { listar, crear, modificar, eliminar } = require("../controllers/coberturaController");
const { verificarToken, verificarRol } = require("../middlewares/auth");

// Listado publico de coberturas (reutilizable desde el registro de pacientes).
router.get("/", listar);

// CRUD de coberturas: solo el rol administrador (Semana 2).
router.post("/", verificarToken, verificarRol("admin", "administrador"), crear);
router.put("/:id", verificarToken, verificarRol("admin", "administrador"), modificar);
router.delete("/:id", verificarToken, verificarRol("admin", "administrador"), eliminar);

module.exports = router;
