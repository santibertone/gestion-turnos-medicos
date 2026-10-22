// Controller de disponibilidad para solicitar turnos (paciente / operador).
//   - fechas:   para un medico, especialidad y sede, las fechas con agenda (desde hoy).
//   - horarios: para un medico, fecha, especialidad y sede, los horarios libres
//               (rangos de agenda menos los turnos confirmados).
// La duracion de cada turno es de 30 minutos, coherente con el alta de turno.

const { pool } = require("../config/db");
const { responderOk, responderError } = require("../utils/respuesta");

const DURACION_TURNO_MIN = 30;

// Convierte "HH:MM" a minutos desde medianoche y viceversa.
function aMinutos(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function aHora(min) {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

// GET /disponibilidad/fechas?id_medico=&id_especialidad=&id_sede=
async function fechas(req, res) {
  try {
    const { id_medico, id_especialidad, id_sede } = req.query;
    if (!id_medico || !id_especialidad || !id_sede) {
      return responderError(res, 400, "Faltan parametros (id_medico, id_especialidad, id_sede)");
    }

    const [filas] = await pool.query(
      `SELECT DISTINCT DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha
         FROM agenda
        WHERE id_medico = ? AND id_especialidad = ? AND id_sede = ?
          AND fecha >= CURDATE()
        ORDER BY fecha`,
      [id_medico, id_especialidad, id_sede]
    );

    return responderOk(res, 200, filas.map((f) => f.fecha));
  } catch (error) {
    console.error("Error al consultar fechas disponibles:", error);
    return responderError(res, 500, "Error interno al consultar la disponibilidad");
  }
}

// GET /disponibilidad/horarios?id_medico=&fecha=&id_especialidad=&id_sede=
async function horarios(req, res) {
  try {
    const { id_medico, fecha, id_especialidad, id_sede } = req.query;
    if (!id_medico || !fecha || !id_especialidad || !id_sede) {
      return responderError(res, 400, "Faltan parametros (id_medico, fecha, id_especialidad, id_sede)");
    }

    // Rangos de agenda del medico para esa especialidad, sede y fecha.
    const [rangos] = await pool.query(
      `SELECT id, hora_entrada, hora_salida
         FROM agenda
        WHERE id_medico = ? AND id_especialidad = ? AND id_sede = ? AND fecha = ?`,
      [id_medico, id_especialidad, id_sede, fecha]
    );
    if (rangos.length === 0) {
      return responderOk(res, 200, []);
    }

    // Horarios ya ocupados por turnos confirmados en esas agendas.
    const idsAgenda = rangos.map((r) => r.id);
    const [ocupadosRows] = await pool.query(
      `SELECT hora FROM turno
        WHERE id_agenda IN (?) AND fecha = ? AND estado = 'confirmado'`,
      [idsAgenda, fecha]
    );
    const ocupados = new Set(ocupadosRows.map((o) => o.hora));

    // Genera los slots de 30 minutos de cada rango y descarta los ocupados.
    const libres = [];
    for (const rango of rangos) {
      const fin = aMinutos(rango.hora_salida);
      for (let min = aMinutos(rango.hora_entrada); min + DURACION_TURNO_MIN <= fin; min += DURACION_TURNO_MIN) {
        const hora = aHora(min);
        if (!ocupados.has(hora) && !libres.includes(hora)) {
          libres.push(hora);
        }
      }
    }
    libres.sort();

    return responderOk(res, 200, libres);
  } catch (error) {
    console.error("Error al consultar horarios libres:", error);
    return responderError(res, 500, "Error interno al consultar la disponibilidad");
  }
}

module.exports = { fechas, horarios };
