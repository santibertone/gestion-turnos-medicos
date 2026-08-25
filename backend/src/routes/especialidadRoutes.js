const express = require("express");
const router = express.Router();
const { listar, crear, modificar, eliminar } = require("../controllers/especialidadController");
const { verificarToken, verificarRol } = require("../middlewares/auth");

// CRUD de especialidades: solo el rol administrador.
router.use(verificarToken, verificarRol("admin", "administrador"));

router.get("/", listar);
router.post("/", crear);
router.put("/:id", modificar);
router.delete("/:id", eliminar);

module.exports = router;
