const express = require("express");
const router = express.Router();
const { listar, crear, modificar, eliminar } = require("../controllers/sedeController");
const { verificarToken, verificarRol } = require("../middlewares/auth");
const { auditar } = require("../middlewares/auditoria");

// CRUD de sedes: solo el rol administrador. La auditoria registra automaticamente
// las altas/bajas/modificaciones (el GET no se audita).
router.use(verificarToken, verificarRol("admin", "administrador"), auditar("sede"));

router.get("/", listar);
router.post("/", crear);
router.put("/:id", modificar);
router.delete("/:id", eliminar);

module.exports = router;
