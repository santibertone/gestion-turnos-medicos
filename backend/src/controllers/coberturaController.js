// Controller de coberturas.
// En Semana 1 solo se necesita el listado de solo lectura, reutilizable
// desde el registro de pacientes. En Semana 2 se le agrega el CRUD completo.

const { pool } = require("../config/db");
const { responderOk, responderError } = require("../utils/respuesta");

// GET /coberturas  -> lista las coberturas disponibles (publico)
async function listar(req, res) {
  try {
    const [coberturas] = await pool.query(
      "SELECT id, nombre FROM cobertura ORDER BY nombre"
    );
    return responderOk(res, 200, coberturas);
  } catch (error) {
    console.error("Error al listar coberturas:", error);
    return responderError(res, 500, "Error interno al listar coberturas");
  }
}

module.exports = { listar };
