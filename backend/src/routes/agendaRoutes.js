const express = require("express");
const router = express.Router();
const { crear, listar, modificar, eliminar } = require("../controllers/agendaController");
const { verificarToken, verificarRol } = require("../middlewares/auth");

// Agenda medica: acceden medico (solo la suya) y operador (cualquiera).
// El paciente queda excluido por el middleware de rol.
router.use(verificarToken, verificarRol("medico", "operador"));

router.post("/", crear);
router.get("/", listar);
router.put("/:id", modificar);
router.delete("/:id", eliminar);

module.exports = router;
