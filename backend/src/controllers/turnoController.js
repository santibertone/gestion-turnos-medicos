// Controller de turnos (Semana 3): alta, cancelacion, atencion y listados.
//
// Reglas de rol (ademas de lo que exige cada ruta):
//   - paciente: solo opera sobre SUS propios turnos.
//   - operador: puede sacar turnos en representacion de un paciente y operar
//               sobre turnos de SU propia sede.
//   - medico:   opera sobre turnos de su sede y solo atiende los suyos.
//
// Cada cambio de estado (confirmado -> cancelado / atendido) genera una
// notificacion interna para el paciente (helper utils/notificaciones).

const { pool } = require("../config/db");
const { responderOk, responderError } = require("../utils/respuesta");
const { crearNotificacion } = require("../utils/notificaciones");

// POST /turnos  -> alta de un turno (paciente propio / operador en representacion)
async function crear(req, res) {
  try {
    const { id_especialidad, id_sede, id_medico, fecha, hora, nota } = req.body;

    // La nota es obligatoria segun el enunciado, ademas del resto de los datos.
    if (!id_especialidad || !id_sede || !id_medico || !fecha || !hora || !nota) {
      return responderError(res, 400, "Faltan datos obligatorios del turno (especialidad, sede, medico, fecha, hora y nota)");
    }

    // Determinar el paciente del turno segun el rol.
    let id_paciente;
    if (req.usuario.rol === "paciente") {
      // El paciente solo puede sacar turno para si mismo (no puede pisar id_paciente).
      id_paciente = req.usuario.id;
    } else {
      // El operador saca el turno en representacion de un paciente.
      id_paciente = req.body.id_paciente;
      if (!id_paciente) {
        return responderError(res, 400, "El operador debe indicar el id_paciente");
      }
      const [pacientes] = await pool.query(
        "SELECT id FROM usuario WHERE id = ? AND rol = 'paciente'",
        [id_paciente]
      );
      if (pacientes.length === 0) {
        return responderError(res, 400, "El paciente indicado no existe");
      }
    }

    // La cobertura se toma SIEMPRE de la registrada por el paciente; nunca del body.
    const [datosPaciente] = await pool.query(
      "SELECT id_cobertura FROM usuario WHERE id = ?",
      [id_paciente]
    );
    const id_cobertura = datosPaciente[0] && datosPaciente[0].id_cobertura;
    if (!id_cobertura) {
      return responderError(res, 400, "El paciente no tiene una cobertura registrada");
    }

    // Debe existir una agenda del medico para esa especialidad, sede y fecha,
    // cuyo rango horario contenga la hora solicitada. Se compara como texto
    // "HH:MM" (formato fijo de 24h, orden lexicografico = orden cronologico).
    const [agendas] = await pool.query(
      `SELECT id FROM agenda
        WHERE id_medico = ? AND id_especialidad = ? AND id_sede = ? AND fecha = ?
          AND hora_entrada <= ? AND hora_salida > ?`,
      [id_medico, id_especialidad, id_sede, fecha, hora, hora]
    );
    if (agendas.length === 0) {
      return responderError(res, 409, "El horario solicitado no esta disponible en la agenda del medico");
    }
    const id_agenda = agendas[0].id;

    // No puede superponerse con otro turno ya confirmado en el mismo horario.
    const [ocupados] = await pool.query(
      "SELECT COUNT(*) AS total FROM turno WHERE id_agenda = ? AND fecha = ? AND hora = ? AND estado = 'confirmado'",
      [id_agenda, fecha, hora]
    );
    if (ocupados[0].total > 0) {
      return responderError(res, 409, "Ya existe un turno confirmado en ese horario");
    }

    // Alta del turno en estado 'confirmado'.
    const [resultado] = await pool.query(
      `INSERT INTO turno (nota, id_agenda, fecha, hora, id_paciente, id_cobertura, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'confirmado')`,
      [nota, id_agenda, fecha, hora, id_paciente, id_cobertura]
    );

    // Notificacion para el paciente por la confirmacion del turno.
    const fechaLegible = formatearFecha(fecha);
    await crearNotificacion(
      id_paciente,
      "turno_confirmado",
      `Tu turno del ${fechaLegible} a las ${hora} fue confirmado.`
    );

    return responderOk(res, 201, {
      id: resultado.insertId,
      id_agenda,
      fecha,
      hora,
      id_paciente: Number(id_paciente),
      id_cobertura,
      estado: "confirmado",
      nota,
    });
  } catch (error) {
    console.error("Error al crear turno:", error);
    return responderError(res, 500, "Error interno al crear el turno");
  }
}

// PUT /turnos/:id/cancelar  -> cancela un turno (paciente propio / operador-medico de su sede)
async function cancelar(req, res) {
  try {
    const { id } = req.params;

    const [turnos] = await pool.query(
      `SELECT t.id, t.estado, t.id_paciente, t.hora,
              DATE_FORMAT(t.fecha, '%d/%m/%Y') AS fecha_fmt,
              a.id_sede, a.id_medico
         FROM turno t
         JOIN agenda a ON a.id = t.id_agenda
        WHERE t.id = ?`,
      [id]
    );
    if (turnos.length === 0) {
      return responderError(res, 404, "El turno no existe");
    }
    const turno = turnos[0];

    // No se puede cancelar un turno que ya no esta confirmado.
    if (turno.estado === "cancelado") {
      return responderError(res, 409, "El turno ya esta cancelado");
    }
    if (turno.estado === "atendido") {
      return responderError(res, 409, "No se puede cancelar un turno ya atendido");
    }

    // Control de acceso segun rol.
    if (req.usuario.rol === "paciente") {
      if (turno.id_paciente !== req.usuario.id) {
        return responderError(res, 403, "Solo podes cancelar tus propios turnos");
      }
    } else {
      // operador / medico: solo turnos de su propia sede.
      if (turno.id_sede !== req.usuario.id_sede) {
        return responderError(res, 403, "Solo podes cancelar turnos de tu sede");
      }
    }

    await pool.query("UPDATE turno SET estado = 'cancelado' WHERE id = ?", [id]);

    // Notificacion para el paciente (y tambien para el medico del turno).
    await crearNotificacion(
      turno.id_paciente,
      "turno_cancelado",
      `Tu turno del ${turno.fecha_fmt} a las ${turno.hora} fue cancelado.`
    );
    await crearNotificacion(
      turno.id_medico,
      "turno_cancelado",
      `Se cancelo el turno del ${turno.fecha_fmt} a las ${turno.hora}.`
    );

    return responderOk(res, 200, { id: Number(id), estado: "cancelado" });
  } catch (error) {
    console.error("Error al cancelar turno:", error);
    return responderError(res, 500, "Error interno al cancelar el turno");
  }
}

// PUT /turnos/:id/atender  -> el medico marca su turno como atendido
async function atender(req, res) {
  try {
    const { id } = req.params;

    const [turnos] = await pool.query(
      `SELECT t.id, t.estado, t.id_paciente, t.hora,
              DATE_FORMAT(t.fecha, '%d/%m/%Y') AS fecha_fmt,
              a.id_medico
         FROM turno t
         JOIN agenda a ON a.id = t.id_agenda
        WHERE t.id = ?`,
      [id]
    );
    if (turnos.length === 0) {
      return responderError(res, 404, "El turno no existe");
    }
    const turno = turnos[0];

    // El medico solo puede atender sus propios turnos.
    if (turno.id_medico !== req.usuario.id) {
      return responderError(res, 403, "Un medico solo puede atender sus propios turnos");
    }

    // Solo se puede atender un turno confirmado.
    if (turno.estado === "cancelado") {
      return responderError(res, 409, "No se puede atender un turno cancelado");
    }
    if (turno.estado === "atendido") {
      return responderError(res, 409, "El turno ya fue atendido");
    }

    await pool.query("UPDATE turno SET estado = 'atendido' WHERE id = ?", [id]);

    // Notificacion para el paciente por la atencion del turno.
    await crearNotificacion(
      turno.id_paciente,
      "turno_atendido",
      `Tu turno del ${turno.fecha_fmt} a las ${turno.hora} fue atendido.`
    );

    return responderOk(res, 200, { id: Number(id), estado: "atendido" });
  } catch (error) {
    console.error("Error al atender turno:", error);
    return responderError(res, 500, "Error interno al atender el turno");
  }
}

// GET /turnos/mis-turnos  -> turnos del paciente autenticado (del mas proximo al menos)
async function misTurnos(req, res) {
  try {
    const [turnos] = await pool.query(
      `SELECT t.id, t.fecha, t.hora, t.nota, t.estado,
              a.id_medico, u.apellido AS medico_apellido, u.nombre AS medico_nombre,
              e.descripcion AS especialidad, s.nombre AS sede
         FROM turno t
         JOIN agenda a ON a.id = t.id_agenda
         JOIN usuario u ON u.id = a.id_medico
         JOIN especialidad e ON e.id = a.id_especialidad
         JOIN sede s ON s.id = a.id_sede
        WHERE t.id_paciente = ?
        ORDER BY t.fecha ASC, t.hora ASC`,
      [req.usuario.id]
    );
    return responderOk(res, 200, turnos);
  } catch (error) {
    console.error("Error al listar mis turnos:", error);
    return responderError(res, 500, "Error interno al listar los turnos");
  }
}

// GET /turnos/agenda-medico?fecha=YYYY-MM-DD  -> turnos programados del medico autenticado
async function turnosDelMedico(req, res) {
  try {
    const { fecha } = req.query;

    const condiciones = ["a.id_medico = ?"];
    const valores = [req.usuario.id];
    if (fecha) {
      condiciones.push("t.fecha = ?");
      valores.push(fecha);
    }

    const [turnos] = await pool.query(
      `SELECT t.id, t.fecha, t.hora, t.nota, t.estado,
              t.id_paciente, p.apellido AS paciente_apellido, p.nombre AS paciente_nombre,
              e.descripcion AS especialidad, s.nombre AS sede
         FROM turno t
         JOIN agenda a ON a.id = t.id_agenda
         JOIN usuario p ON p.id = t.id_paciente
         JOIN especialidad e ON e.id = a.id_especialidad
         JOIN sede s ON s.id = a.id_sede
        WHERE ${condiciones.join(" AND ")}
        ORDER BY t.fecha ASC, t.hora ASC`,
      valores
    );
    return responderOk(res, 200, turnos);
  } catch (error) {
    console.error("Error al listar turnos del medico:", error);
    return responderError(res, 500, "Error interno al listar los turnos");
  }
}

// GET /turnos/sede?fecha=YYYY-MM-DD  -> turnos de la sede del operador autenticado
async function turnosDeLaSede(req, res) {
  try {
    const { fecha } = req.query;

    const condiciones = ["a.id_sede = ?"];
    const valores = [req.usuario.id_sede];
    if (fecha) {
      condiciones.push("t.fecha = ?");
      valores.push(fecha);
    }

    const [turnos] = await pool.query(
      `SELECT t.id, t.fecha, t.hora, t.nota, t.estado,
              t.id_paciente, p.apellido AS paciente_apellido, p.nombre AS paciente_nombre,
              a.id_medico, m.apellido AS medico_apellido, m.nombre AS medico_nombre,
              e.descripcion AS especialidad
         FROM turno t
         JOIN agenda a ON a.id = t.id_agenda
         JOIN usuario p ON p.id = t.id_paciente
         JOIN usuario m ON m.id = a.id_medico
         JOIN especialidad e ON e.id = a.id_especialidad
        WHERE ${condiciones.join(" AND ")}
        ORDER BY t.fecha ASC, t.hora ASC`,
      valores
    );
    return responderOk(res, 200, turnos);
  } catch (error) {
    console.error("Error al listar turnos de la sede:", error);
    return responderError(res, 500, "Error interno al listar los turnos");
  }
}

// Formatea una fecha 'YYYY-MM-DD' (string) a 'DD/MM/YYYY' para los mensajes.
function formatearFecha(fecha) {
  const partes = String(fecha).split("-");
  if (partes.length !== 3) return fecha;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

module.exports = {
  crear,
  cancelar,
  atender,
  misTurnos,
  turnosDelMedico,
  turnosDeLaSede,
};
