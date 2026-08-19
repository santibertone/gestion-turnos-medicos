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

// POST /coberturas  -> alta de una cobertura (solo administrador)
async function crear(req, res) {
  try {
    const { nombre } = req.body;

    if (!nombre) {
      return responderError(res, 400, "Falta el dato obligatorio: nombre");
    }

    const [resultado] = await pool.query(
      "INSERT INTO cobertura (nombre) VALUES (?)",
      [nombre]
    );

    return responderOk(res, 201, { id: resultado.insertId, nombre });
  } catch (error) {
    console.error("Error al crear cobertura:", error);
    return responderError(res, 500, "Error interno al crear la cobertura");
  }
}

// PUT /coberturas/:id  -> modificacion de una cobertura (solo administrador)
async function modificar(req, res) {
  try {
    const { id } = req.params;
    const { nombre } = req.body;

    if (!nombre) {
      return responderError(res, 400, "Falta el dato obligatorio: nombre");
    }

    const [resultado] = await pool.query(
      "UPDATE cobertura SET nombre = ? WHERE id = ?",
      [nombre, id]
    );

    if (resultado.affectedRows === 0) {
      return responderError(res, 404, "La cobertura no existe");
    }

    return responderOk(res, 200, { id: Number(id), nombre });
  } catch (error) {
    console.error("Error al modificar cobertura:", error);
    return responderError(res, 500, "Error interno al modificar la cobertura");
  }
}

// DELETE /coberturas/:id  -> baja (con validacion de dependencias)
async function eliminar(req, res) {
  try {
    const { id } = req.params;

    const [coberturas] = await pool.query(
      "SELECT id FROM cobertura WHERE id = ?",
      [id]
    );
    if (coberturas.length === 0) {
      return responderError(res, 404, "La cobertura no existe");
    }

    // No se puede eliminar si algun usuario la tiene asociada.
    const [usuarios] = await pool.query(
      "SELECT COUNT(*) AS total FROM usuario WHERE id_cobertura = ?",
      [id]
    );
    if (usuarios[0].total > 0) {
      return responderError(res, 409, "No se puede eliminar: hay usuarios con esta cobertura asociada");
    }

    // No se puede eliminar si esta usada en algun turno.
    const [turnos] = await pool.query(
      "SELECT COUNT(*) AS total FROM turno WHERE id_cobertura = ?",
      [id]
    );
    if (turnos[0].total > 0) {
      return responderError(res, 409, "No se puede eliminar: la cobertura esta usada en turnos");
    }

    await pool.query("DELETE FROM cobertura WHERE id = ?", [id]);
    return responderOk(res, 200, { id: Number(id), eliminada: true });
  } catch (error) {
    console.error("Error al eliminar cobertura:", error);
    return responderError(res, 500, "Error interno al eliminar la cobertura");
  }
}

module.exports = { listar, crear, modificar, eliminar };
