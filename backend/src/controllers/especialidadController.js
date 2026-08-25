// Controller de especialidades (Semana 2).
// CRUD completo, solo accesible por el rol administrador (protegido en las rutas).
// Antes de eliminar se valida que ningun medico la tenga asociada (medico_especialidad)
// ni que este usada en alguna agenda.

const { pool } = require("../config/db");
const { responderOk, responderError } = require("../utils/respuesta");

// GET /especialidades  -> lista todas las especialidades
async function listar(req, res) {
  try {
    const [especialidades] = await pool.query(
      "SELECT id, descripcion FROM especialidad ORDER BY descripcion"
    );
    return responderOk(res, 200, especialidades);
  } catch (error) {
    console.error("Error al listar especialidades:", error);
    return responderError(res, 500, "Error interno al listar especialidades");
  }
}

// POST /especialidades  -> alta de una especialidad
async function crear(req, res) {
  try {
    const { descripcion } = req.body;

    if (!descripcion) {
      return responderError(res, 400, "Falta el dato obligatorio: descripcion");
    }

    const [resultado] = await pool.query(
      "INSERT INTO especialidad (descripcion) VALUES (?)",
      [descripcion]
    );

    return responderOk(res, 201, { id: resultado.insertId, descripcion });
  } catch (error) {
    console.error("Error al crear especialidad:", error);
    return responderError(res, 500, "Error interno al crear la especialidad");
  }
}

// PUT /especialidades/:id  -> modificacion de una especialidad
async function modificar(req, res) {
  try {
    const { id } = req.params;
    const { descripcion } = req.body;

    if (!descripcion) {
      return responderError(res, 400, "Falta el dato obligatorio: descripcion");
    }

    const [resultado] = await pool.query(
      "UPDATE especialidad SET descripcion = ? WHERE id = ?",
      [descripcion, id]
    );

    if (resultado.affectedRows === 0) {
      return responderError(res, 404, "La especialidad no existe");
    }

    return responderOk(res, 200, { id: Number(id), descripcion });
  } catch (error) {
    console.error("Error al modificar especialidad:", error);
    return responderError(res, 500, "Error interno al modificar la especialidad");
  }
}

// DELETE /especialidades/:id  -> baja (con validacion de dependencias)
async function eliminar(req, res) {
  try {
    const { id } = req.params;

    const [especialidades] = await pool.query(
      "SELECT id FROM especialidad WHERE id = ?",
      [id]
    );
    if (especialidades.length === 0) {
      return responderError(res, 404, "La especialidad no existe");
    }

    // No se puede eliminar si algun medico la tiene asociada.
    const [asignadas] = await pool.query(
      "SELECT COUNT(*) AS total FROM medico_especialidad WHERE id_especialidad = ?",
      [id]
    );
    if (asignadas[0].total > 0) {
      return responderError(res, 409, "No se puede eliminar: hay medicos con esta especialidad asociada");
    }

    // No se puede eliminar si esta usada en alguna agenda.
    const [agenda] = await pool.query(
      "SELECT COUNT(*) AS total FROM agenda WHERE id_especialidad = ?",
      [id]
    );
    if (agenda[0].total > 0) {
      return responderError(res, 409, "No se puede eliminar: la especialidad esta usada en la agenda");
    }

    await pool.query("DELETE FROM especialidad WHERE id = ?", [id]);
    return responderOk(res, 200, { id: Number(id), eliminada: true });
  } catch (error) {
    console.error("Error al eliminar especialidad:", error);
    return responderError(res, 500, "Error interno al eliminar la especialidad");
  }
}

module.exports = { listar, crear, modificar, eliminar };
