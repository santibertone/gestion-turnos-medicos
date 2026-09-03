const express = require("express");
const router = express.Router();
const { listar, marcarLeida } = require("../controllers/notificacionController");
const { verificarToken } = require("../middlewares/auth");

// Cualquier usuario autenticado gestiona SUS propias notificaciones.
router.use(verificarToken);

router.get("/", listar);
router.put("/:id/leida", marcarLeida);

module.exports = router;
