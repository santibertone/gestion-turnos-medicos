// Controller de notificaciones (Semana 3).
// Las notificaciones se generan INTERNAMENTE desde los eventos de turno
// (ver utils/notificaciones), NO por un endpoint publico. Aca solo se exponen
// las dos operaciones del usuario autenticado sobre sus propias notificaciones:
//   - listar: sus notificaciones, de la mas reciente a la mas antigua.
//   - marcarLeida: marca una notificacion propia como leida.

const { pool } = require("../config/db");
const { responderOk, responderError } = require("../utils/respuesta");

// GET /notificaciones  -> notificaciones del usuario autenticado (mas reciente primero)
async function listar(req, res) {
  try {
    const [notificaciones] = await pool.query(
      `SELECT id, tipo, mensaje, leida, fecha
         FROM notificacion
        WHERE id_usuario = ?
        ORDER BY fecha DESC, id DESC`,
      [req.usuario.id]
    );
    return responderOk(res, 200, notificaciones);
  } catch (error) {
    console.error("Error al listar notificaciones:", error);
    return responderError(res, 500, "Error interno al listar las notificaciones");
  }
}

// PUT /notificaciones/:id/leida  -> marca como leida una notificacion propia
async function marcarLeida(req, res) {
  try {
    const { id } = req.params;

    // Solo puede marcar notificaciones que le pertenecen.
    const [notificaciones] = await pool.query(
      "SELECT id FROM notificacion WHERE id = ? AND id_usuario = ?",
      [id, req.usuario.id]
    );
    if (notificaciones.length === 0) {
      return responderError(res, 404, "La notificacion no existe");
    }

    await pool.query("UPDATE notificacion SET leida = 1 WHERE id = ?", [id]);
    return responderOk(res, 200, { id: Number(id), leida: 1 });
  } catch (error) {
    console.error("Error al marcar notificacion:", error);
    return responderError(res, 500, "Error interno al marcar la notificacion");
  }
}

module.exports = { listar, marcarLeida };
