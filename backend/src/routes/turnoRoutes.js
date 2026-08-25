const express = require("express");
const router = express.Router();
const {
  crear,
  cancelar,
  atender,
  misTurnos,
  turnosDelMedico,
  turnosDeLaSede,
} = require("../controllers/turnoController");
const { verificarToken, verificarRol } = require("../middlewares/auth");

// Todos los endpoints de turnos requieren autenticacion.
router.use(verificarToken);

// Alta de turno: el paciente para si mismo, o el operador en su representacion.
router.post("/", verificarRol("paciente", "operador"), crear);

// Listados (rutas literales, van antes que las de :id/accion).
router.get("/mis-turnos", verificarRol("paciente"), misTurnos);
router.get("/agenda-medico", verificarRol("medico"), turnosDelMedico);
router.get("/sede", verificarRol("operador"), turnosDeLaSede);

// Cambios de estado.
router.put("/:id/cancelar", verificarRol("paciente", "operador", "medico"), cancelar);
router.put("/:id/atender", verificarRol("medico"), atender);

module.exports = router;
