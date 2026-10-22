// Controller de notificaciones (ampliacion para el frontend).
// Cada usuario ve y gestiona SOLO sus propias notificaciones.
//   - listar:      todas las del usuario, de la mas reciente a la mas antigua.
//   - contarNoLeidas: cantidad de no leidas (para el contador de la campana).
//   - marcarLeida: marca una notificacion propia como leida.

const { pool } = require("../config/db");
const { responderOk, responderError } = require("../utils/respuesta");

// GET /notificaciones  -> notificaciones del usuario autenticado
async function listar(req, res) {
  try {
    const [notificaciones] = await pool.query(
      `SELECT id, tipo, mensaje, leida,
              DATE_FORMAT(fecha, '%Y-%m-%d %H:%i:%s') AS fecha
         FROM notificacion
        WHERE id_usuario = ?
        ORDER BY fecha DESC, id DESC`,
      [req.usuario.id]
    );
    return responderOk(res, 200, notificaciones);
  } catch (error) {
    console.error("Error al listar notificaciones:", error);
    return responderError(res, 500, "Error interno al listar notificaciones");
  }
}

// GET /notificaciones/no-leidas  -> cantidad de no leidas
async function contarNoLeidas(req, res) {
  try {
    const [[{ cantidad }]] = await pool.query(
      "SELECT COUNT(*) AS cantidad FROM notificacion WHERE id_usuario = ? AND leida = 0",
      [req.usuario.id]
    );
    return responderOk(res, 200, { cantidad });
  } catch (error) {
    console.error("Error al contar notificaciones:", error);
    return responderError(res, 500, "Error interno al contar notificaciones");
  }
}

// PUT /notificaciones/:id/leer  -> marca una notificacion propia como leida
async function marcarLeida(req, res) {
  try {
    const { id } = req.params;
    const [resultado] = await pool.query(
      "UPDATE notificacion SET leida = 1 WHERE id = ? AND id_usuario = ?",
      [id, req.usuario.id]
    );
    if (resultado.affectedRows === 0) {
      return responderError(res, 404, "La notificacion no existe");
    }
    return responderOk(res, 200, { id: Number(id), leida: true });
  } catch (error) {
    console.error("Error al marcar notificacion:", error);
    return responderError(res, 500, "Error interno al marcar la notificacion");
  }
}

module.exports = { listar, contarNoLeidas, marcarLeida };
