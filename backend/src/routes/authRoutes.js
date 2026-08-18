const express = require("express");
const router = express.Router();
const { registro, login, perfil } = require("../controllers/authController");
const { verificarToken } = require("../middlewares/auth");

router.post("/registro", registro);
router.post("/login", login);
router.get("/perfil", verificarToken, perfil); // endpoint protegido

module.exports = router;
