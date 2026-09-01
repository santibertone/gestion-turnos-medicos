// Controller de auditoria (Semana 4).
// Consulta de los logs registrados automaticamente por el middleware `auditar`.
// Solo accesible por el rol administrador (protegido en las rutas).
// Admite filtros opcionales por usuario, entidad y rango de fechas.

const { pool } = require("../config/db");
const { responderOk, responderError } = require("../utils/respuesta");

// GET /auditoria?id_usuario=&entidad=&desde=&hasta=
// - id_usuario: filtra por quien realizo la accion.
// - entidad: filtra por entidad afectada (usuario, sede, especialidad, cobertura).
// - desde / hasta: rango de fechas (YYYY-MM-DD), inclusivo.
async function listar(req, res) {
  try {
    const { id_usuario, entidad, desde, hasta } = req.query;

    const condiciones = [];
    const valores = [];

    if (id_usuario) {
      condiciones.push("l.id_usuario = ?");
      valores.push(id_usuario);
    }
    if (entidad) {
      condiciones.push("l.entidad = ?");
      valores.push(entidad);
    }
    if (desde) {
      condiciones.push("l.fecha >= ?");
      valores.push(`${desde} 00:00:00`);
    }
    if (hasta) {
      condiciones.push("l.fecha <= ?");
      valores.push(`${hasta} 23:59:59`);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

    const [logs] = await pool.query(
      `SELECT l.id, l.id_usuario,
              CONCAT(u.apellido, ' ', u.nombre) AS usuario,
              l.accion, l.entidad, l.id_entidad, l.detalle,
              DATE_FORMAT(l.fecha, '%d/%m/%Y %H:%i') AS fecha
         FROM log_auditoria l
         JOIN usuario u ON u.id = l.id_usuario
         ${where}
        ORDER BY l.fecha DESC, l.id DESC`,
      valores
    );

    return responderOk(res, 200, logs);
  } catch (error) {
    console.error("Error al listar auditoria:", error);
    return responderError(res, 500, "Error interno al consultar la auditoria");
  }
}

module.exports = { listar };
