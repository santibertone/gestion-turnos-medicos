// Controller de reportes y estadisticas (Semana 4).
// Consultas agregadas sobre turno / agenda / especialidad / sede.
// Solo accesible por el rol administrador (protegido en las rutas).
// Todos los indicadores admiten filtro por rango de fechas (?desde=&hasta=)
// aplicado sobre la fecha del turno.

const { pool } = require("../config/db");
const { responderOk, responderError } = require("../utils/respuesta");

// Arma la condicion de rango de fechas sobre t.fecha a partir del query string.
// Devuelve { clausula, valores } para concatenar en el WHERE.
function filtroFechas(query, extra = []) {
  const { desde, hasta } = query;
  const condiciones = [...extra];
  const valores = [];
  if (desde) {
    condiciones.push("t.fecha >= ?");
    valores.push(desde);
  }
  if (hasta) {
    condiciones.push("t.fecha <= ?");
    valores.push(hasta);
  }
  const clausula = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
  return { clausula, valores };
}

// GET /reportes/turnos-por-especialidad?desde=&hasta=
async function turnosPorEspecialidad(req, res) {
  try {
    const { clausula, valores } = filtroFechas(req.query);
    const [filas] = await pool.query(
      `SELECT e.id AS id_especialidad, e.descripcion AS especialidad,
              COUNT(t.id) AS cantidad_turnos
         FROM turno t
         JOIN agenda a ON a.id = t.id_agenda
         JOIN especialidad e ON e.id = a.id_especialidad
         ${clausula}
        GROUP BY e.id, e.descripcion
        ORDER BY cantidad_turnos DESC, e.descripcion`,
      valores
    );
    return responderOk(res, 200, filas);
  } catch (error) {
    console.error("Error en reporte turnos por especialidad:", error);
    return responderError(res, 500, "Error interno al generar el reporte");
  }
}

// GET /reportes/turnos-por-sede?desde=&hasta=
async function turnosPorSede(req, res) {
  try {
    const { clausula, valores } = filtroFechas(req.query);
    const [filas] = await pool.query(
      `SELECT s.id AS id_sede, s.nombre AS sede,
              COUNT(t.id) AS cantidad_turnos
         FROM turno t
         JOIN agenda a ON a.id = t.id_agenda
         JOIN sede s ON s.id = a.id_sede
         ${clausula}
        GROUP BY s.id, s.nombre
        ORDER BY cantidad_turnos DESC, s.nombre`,
      valores
    );
    return responderOk(res, 200, filas);
  } catch (error) {
    console.error("Error en reporte turnos por sede:", error);
    return responderError(res, 500, "Error interno al generar el reporte");
  }
}

// GET /reportes/ranking-medicos?desde=&hasta=
// Ranking (todos, no solo el primero) de medicos por turnos ATENDIDOS.
async function rankingMedicos(req, res) {
  try {
    const { clausula, valores } = filtroFechas(req.query, ["t.estado = 'atendido'"]);
    const [filas] = await pool.query(
      `SELECT u.id AS id_medico,
              CONCAT(u.apellido, ' ', u.nombre) AS medico,
              COUNT(t.id) AS turnos_atendidos
         FROM turno t
         JOIN agenda a ON a.id = t.id_agenda
         JOIN usuario u ON u.id = a.id_medico
         ${clausula}
        GROUP BY u.id, u.apellido, u.nombre
        ORDER BY turnos_atendidos DESC, medico`,
      valores
    );
    return responderOk(res, 200, filas);
  } catch (error) {
    console.error("Error en ranking de medicos:", error);
    return responderError(res, 500, "Error interno al generar el reporte");
  }
}

// GET /reportes/tasa-cancelacion?desde=&hasta=
// Tasa de cancelacion del periodo: cancelados / total de turnos.
async function tasaCancelacion(req, res) {
  try {
    const { clausula, valores } = filtroFechas(req.query);
    const [filas] = await pool.query(
      `SELECT COUNT(t.id) AS total_turnos,
              SUM(CASE WHEN t.estado = 'cancelado' THEN 1 ELSE 0 END) AS cancelados
         FROM turno t
         ${clausula}`,
      valores
    );

    const total = Number(filas[0].total_turnos) || 0;
    const cancelados = Number(filas[0].cancelados) || 0;
    // Tasa como proporcion 0..1 (redondeada) y su equivalente en porcentaje.
    const tasa = total === 0 ? 0 : Number((cancelados / total).toFixed(4));

    return responderOk(res, 200, {
      total_turnos: total,
      cancelados,
      tasa_cancelacion: tasa,
      porcentaje: `${(tasa * 100).toFixed(2)}%`,
    });
  } catch (error) {
    console.error("Error en tasa de cancelacion:", error);
    return responderError(res, 500, "Error interno al generar el reporte");
  }
}

module.exports = {
  turnosPorEspecialidad,
  turnosPorSede,
  rankingMedicos,
  tasaCancelacion,
};
