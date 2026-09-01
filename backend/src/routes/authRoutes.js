const express = require("express");
const router = express.Router();
const { registro, login, perfil } = require("../controllers/authController");
const { verificarToken } = require("../middlewares/auth");
const { auditar } = require("../middlewares/auditoria");

// El alta de usuario queda auditada automaticamente (Semana 4).
router.post("/registro", auditar("usuario"), registro);
router.post("/login", login);
router.get("/perfil", verificarToken, perfil); // endpoint protegido

module.exports = router;
