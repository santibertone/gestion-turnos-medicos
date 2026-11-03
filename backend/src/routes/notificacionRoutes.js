const express = require("express");
const router = express.Router();
const { listar, contarNoLeidas, marcarLeida } = require("../controllers/notificacionController");
const { verificarToken } = require("../middlewares/auth");

// Todas las notificaciones son por usuario: basta con tener sesion iniciada.
router.use(verificarToken);

router.get("/", listar);
router.get("/no-leidas", contarNoLeidas);
router.put("/:id/leer", marcarLeida);

module.exports = router;
