const express = require("express");
const router = express.Router();
const { listar, crear, modificar } = require("../controllers/usuarioController");
const { verificarToken, verificarRol } = require("../middlewares/auth");
const { auditar } = require("../middlewares/auditoria");

// Gestion de usuarios: solo el rol administrador. Cada alta/modificacion queda
// registrada en la auditoria.
router.use(verificarToken, verificarRol("admin", "administrador"), auditar("usuario"));

router.get("/", listar);
router.post("/", crear);
router.put("/:id", modificar);

module.exports = router;
