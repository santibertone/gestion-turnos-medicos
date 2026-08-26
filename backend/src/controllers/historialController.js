// Controller de historial clinico (Semana 3).
//   - registrar: el medico carga diagnostico/tratamiento/observaciones de un
//     turno atendido por el mismo. El historial queda asociado al turno (id_turno).
//   - consultarPorPaciente: consulta con control de acceso:
//       * paciente -> unicamente su propio historial completo.
//       * medico   -> unicamente los registros de los turnos que el atendio.

const { pool } = require("../config/db");
const { responderOk, responderError } = require("../utils/respuesta");

// POST /historial  -> el medico registra el historial de un turno atendido
async function registrar(req, res) {
  try {
    const { id_turno, diagnostico, tratamiento, observaciones } = req.body;

    if (!id_turno || !diagnostico) {
      return responderError(res, 400, "Faltan datos obligatorios (id_turno y diagnostico)");
    }

    // El turno debe existir; se trae el medico de su agenda y el paciente.
    const [turnos] = await pool.query(
      `SELECT t.id, t.estado, t.id_paciente, a.id_medico
         FROM turno t
         JOIN agenda a ON a.id = t.id_agenda
        WHERE t.id = ?`,
      [id_turno]
    );
    if (turnos.length === 0) {
      return responderError(res, 404, "El turno no existe");
    }
    const turno = turnos[0];

    // Solo el medico que atendio el turno puede cargar el historial.
    if (turno.id_medico !== req.usuario.id) {
      return responderError(res, 403, "Solo podes registrar el historial de tus propios turnos");
    }

    // El historial se carga sobre un turno ya atendido.
    if (turno.estado !== "atendido") {
      return responderError(res, 409, "Solo se puede registrar el historial de un turno atendido");
    }

    // No se duplica el historial de un mismo turno.
    const [existentes] = await pool.query(
      "SELECT id FROM historial_clinico WHERE id_turno = ?",
      [id_turno]
    );
    if (existentes.length > 0) {
      return responderError(res, 409, "El turno ya tiene un historial clinico registrado");
    }

    const [resultado] = await pool.query(
      `INSERT INTO historial_clinico
         (id_turno, id_medico, id_paciente, diagnostico, tratamiento, observaciones)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_turno, req.usuario.id, turno.id_paciente, diagnostico, tratamiento || null, observaciones || null]
    );

    return responderOk(res, 201, {
      id: resultado.insertId,
      id_turno: Number(id_turno),
      id_medico: req.usuario.id,
      id_paciente: turno.id_paciente,
      diagnostico,
    });
  } catch (error) {
    console.error("Error al registrar historial:", error);
    return responderError(res, 500, "Error interno al registrar el historial");
  }
}

// GET /historial/paciente/:id_paciente  -> consulta del historial de un paciente
//   paciente -> solo el suyo (completo); medico -> solo lo que el atendio.
async function consultarPorPaciente(req, res) {
  try {
    const { id_paciente } = req.params;

    const condiciones = ["h.id_paciente = ?"];
    const valores = [id_paciente];

    if (req.usuario.rol === "paciente") {
      // El paciente solo puede consultar su propio historial.
      if (Number(id_paciente) !== req.usuario.id) {
        return responderError(res, 403, "Solo podes consultar tu propio historial");
      }
    } else {
      // El medico solo ve los registros de los turnos que el mismo atendio.
      condiciones.push("h.id_medico = ?");
      valores.push(req.usuario.id);
    }

    const [historial] = await pool.query(
      `SELECT h.id, h.id_turno, h.diagnostico, h.tratamiento, h.observaciones, h.fecha_registro,
              h.id_medico, m.apellido AS medico_apellido, m.nombre AS medico_nombre,
              h.id_paciente, p.apellido AS paciente_apellido, p.nombre AS paciente_nombre,
              t.fecha AS turno_fecha, t.hora AS turno_hora
         FROM historial_clinico h
         JOIN usuario m ON m.id = h.id_medico
         JOIN usuario p ON p.id = h.id_paciente
         JOIN turno t ON t.id = h.id_turno
        WHERE ${condiciones.join(" AND ")}
        ORDER BY h.fecha_registro DESC`,
      valores
    );

    return responderOk(res, 200, historial);
  } catch (error) {
    console.error("Error al consultar historial:", error);
    return responderError(res, 500, "Error interno al consultar el historial");
  }
}

module.exports = { registrar, consultarPorPaciente };
