// Punto de entrada del backend - Sistema de Gestion de Turnos Medicos.

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { responderError } = require("./utils/respuesta");

const app = express();
app.use(cors());
app.use(express.json());

// 404 uniforme para rutas inexistentes.
app.use((req, res) => responderError(res, 404, "Ruta no encontrada"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
