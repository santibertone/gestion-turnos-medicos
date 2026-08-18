// Punto de entrada del backend - Sistema de Gestion de Turnos Medicos.

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { probarConexion } = require("./config/db");
const { responderOk, responderError } = require("./utils/respuesta");
const { verificarToken, verificarRol } = require("./middlewares/auth");

const authRoutes = require("./routes/authRoutes");

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint de salud: prueba la conexion a la base de datos.
app.get("/health", async (req, res) => {
  try {
    await probarConexion();
    return responderOk(res, 200, { servicio: "backend", base: "conectada" });
  } catch (error) {
    return responderError(res, 500, "No se pudo conectar a la base de datos");
  }
});

// Endpoint de prueba protegido por rol (demuestra verificarToken + verificarRol).
app.get(
  "/admin/ping",
  verificarToken,
  verificarRol("admin", "administrador"),
  (req, res) => responderOk(res, 200, { mensaje: "Acceso de administrador OK" })
);

// Rutas de la aplicacion.
app.use("/auth", authRoutes);

// 404 uniforme para rutas inexistentes.
app.use((req, res) => responderError(res, 404, "Ruta no encontrada"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
