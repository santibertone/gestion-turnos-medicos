// Controller de sedes (Semana 2).
// CRUD completo, solo accesible por el rol administrador (protegido en las rutas).
// Antes de eliminar se valida que la sede no tenga usuarios ni agenda asociada.

const { pool } = require("../config/db");
const { responderOk, responderError } = require("../utils/respuesta");

// GET /sedes  -> lista todas las sedes
async function listar(req, res) {
  try {
    const [sedes] = await pool.query(
      "SELECT id, nombre, direccion, telefono FROM sede ORDER BY nombre"
    );
    return responderOk(res, 200, sedes);
  } catch (error) {
    console.error("Error al listar sedes:", error);
    return responderError(res, 500, "Error interno al listar sedes");
  }
}

// POST /sedes  -> alta de una sede
async function crear(req, res) {
  try {
    const { nombre, direccion, telefono } = req.body;

    if (!nombre || !direccion || !telefono) {
      return responderError(res, 400, "Faltan datos obligatorios (nombre, direccion, telefono)");
    }

    const [resultado] = await pool.query(
      "INSERT INTO sede (nombre, direccion, telefono) VALUES (?, ?, ?)",
      [nombre, direccion, telefono]
    );

    return responderOk(res, 201, { id: resultado.insertId, nombre, direccion, telefono });
  } catch (error) {
    console.error("Error al crear sede:", error);
    return responderError(res, 500, "Error interno al crear la sede");
  }
}

// PUT /sedes/:id  -> modificacion de una sede
async function modificar(req, res) {
  try {
    const { id } = req.params;
    const { nombre, direccion, telefono } = req.body;

    if (!nombre || !direccion || !telefono) {
      return responderError(res, 400, "Faltan datos obligatorios (nombre, direccion, telefono)");
    }

    const [resultado] = await pool.query(
      "UPDATE sede SET nombre = ?, direccion = ?, telefono = ? WHERE id = ?",
      [nombre, direccion, telefono, id]
    );

    if (resultado.affectedRows === 0) {
      return responderError(res, 404, "La sede no existe");
    }

    return responderOk(res, 200, { id: Number(id), nombre, direccion, telefono });
  } catch (error) {
    console.error("Error al modificar sede:", error);
    return responderError(res, 500, "Error interno al modificar la sede");
  }
}

// DELETE /sedes/:id  -> baja de una sede (con validacion de dependencias)
async function eliminar(req, res) {
  try {
    const { id } = req.params;

    // La sede debe existir.
    const [sedes] = await pool.query("SELECT id FROM sede WHERE id = ?", [id]);
    if (sedes.length === 0) {
      return responderError(res, 404, "La sede no existe");
    }

    // No se puede eliminar si tiene medicos/operadores asociados.
    const [usuarios] = await pool.query(
      "SELECT COUNT(*) AS total FROM usuario WHERE id_sede = ?",
      [id]
    );
    if (usuarios[0].total > 0) {
      return responderError(res, 409, "No se puede eliminar: la sede tiene usuarios asociados");
    }

    // No se puede eliminar si tiene agenda asociada.
    const [agenda] = await pool.query(
      "SELECT COUNT(*) AS total FROM agenda WHERE id_sede = ?",
      [id]
    );
    if (agenda[0].total > 0) {
      return responderError(res, 409, "No se puede eliminar: la sede tiene agenda asociada");
    }

    await pool.query("DELETE FROM sede WHERE id = ?", [id]);
    return responderOk(res, 200, { id: Number(id), eliminada: true });
  } catch (error) {
    console.error("Error al eliminar sede:", error);
    return responderError(res, 500, "Error interno al eliminar la sede");
  }
}

module.exports = { listar, crear, modificar, eliminar };
