// Controller de medicos (ampliacion para el frontend).
// Lista los medicos con sus especialidades, sin exponer otros datos personales.
// Accesible para cualquier usuario con sesion: lo usan el operador (cargar
// agenda), el medico (ver sus especialidades) y el paciente (solicitar turno).
//
// Filtros opcionales (query):
//   - id_especialidad: medicos que tienen esa especialidad.
//   - id_sede:         medicos que tienen agenda en esa sede.
//   Si se envian ambos, se restringe a medicos con agenda para esa
//   especialidad Y esa sede (lo que necesita el flujo de "Nuevo turno").

const { pool } = require("../config/db");
const { responderOk, responderError } = require("../utils/respuesta");

// GET /medicos?id_especialidad=&id_sede=
async function listar(req, res) {
  try {
    const { id_especialidad, id_sede } = req.query;

    const condiciones = ["u.rol = 'medico'"];
    const valores = [];

    if (id_especialidad && id_sede) {
      // Medicos con agenda para esa especialidad y sede.
      condiciones.push(
        `u.id IN (SELECT id_medico FROM agenda WHERE id_especialidad = ? AND id_sede = ?)`
      );
      valores.push(id_especialidad, id_sede);
    } else if (id_especialidad) {
      condiciones.push(
        `u.id IN (SELECT id_medico FROM medico_especialidad WHERE id_especialidad = ?)`
      );
      valores.push(id_especialidad);
    } else if (id_sede) {
      condiciones.push(`u.id IN (SELECT id_medico FROM agenda WHERE id_sede = ?)`);
      valores.push(id_sede);
    }

    const [medicos] = await pool.query(
      `SELECT u.id, u.nombre, u.apellido
         FROM usuario u
        WHERE ${condiciones.join(" AND ")}
        ORDER BY u.apellido, u.nombre`,
      valores
    );

    // Especialidades de cada medico (una sola consulta y se arma en memoria).
    const [especialidades] = await pool.query(
      `SELECT me.id_medico, e.id, e.descripcion
         FROM medico_especialidad me
         JOIN especialidad e ON e.id = me.id_especialidad
        ORDER BY e.descripcion`
    );

    const porMedico = new Map();
    for (const row of especialidades) {
      if (!porMedico.has(row.id_medico)) porMedico.set(row.id_medico, []);
      porMedico.get(row.id_medico).push({ id: row.id, descripcion: row.descripcion });
    }

    const datos = medicos.map((m) => ({
      ...m,
      especialidades: porMedico.get(m.id) || [],
    }));

    return responderOk(res, 200, datos);
  } catch (error) {
    console.error("Error al listar medicos:", error);
    return responderError(res, 500, "Error interno al listar los medicos");
  }
}

module.exports = { listar };
