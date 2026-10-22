// Controller de agenda medica (Semana 2).
// Reglas de rol (los endpoints ya exigen token + rol medico/operador en las rutas):
//   - medico:   solo puede gestionar SU propia agenda (id_medico === su id).
//   - operador: puede gestionar la agenda de cualquier medico y sede.
//   - paciente: no tiene acceso (bloqueado por el middleware de rol).
// Un medico puede tener varios rangos horarios el mismo dia (no se bloquea por fecha).

const { pool } = require("../config/db");
const { responderOk, responderError } = require("../utils/respuesta");

// Verifica que existan las entidades referenciadas, evitando errores 500 por FK.
async function validarReferencias(id_medico, id_especialidad, id_sede) {
  const [medicos] = await pool.query(
    "SELECT id FROM usuario WHERE id = ? AND rol = 'medico'",
    [id_medico]
  );
  if (medicos.length === 0) return "El medico indicado no existe";

  const [especialidades] = await pool.query(
    "SELECT id FROM especialidad WHERE id = ?",
    [id_especialidad]
  );
  if (especialidades.length === 0) return "La especialidad indicada no existe";

  const [sedes] = await pool.query("SELECT id FROM sede WHERE id = ?", [id_sede]);
  if (sedes.length === 0) return "La sede indicada no existe";

  return null;
}

// POST /agenda  -> alta de un rango horario de agenda
async function crear(req, res) {
  try {
    const { hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede } = req.body;

    if (!hora_entrada || !hora_salida || !fecha || !id_medico || !id_especialidad || !id_sede) {
      return responderError(res, 400, "Faltan datos obligatorios de la agenda");
    }

    // El medico solo puede crear agenda para si mismo.
    if (req.usuario.rol === "medico" && Number(id_medico) !== req.usuario.id) {
      return responderError(res, 403, "Un medico solo puede gestionar su propia agenda");
    }
    // El operador solo puede crear agenda en su propia sede.
    if (req.usuario.rol === "operador" && Number(id_sede) !== req.usuario.id_sede) {
      return responderError(res, 403, "Un operador solo puede gestionar la agenda de su sede");
    }
    // La hora de salida debe ser posterior a la de entrada.
    if (hora_salida <= hora_entrada) {
      return responderError(res, 400, "La hora de salida debe ser posterior a la de entrada");
    }

    const errorRef = await validarReferencias(id_medico, id_especialidad, id_sede);
    if (errorRef) {
      return responderError(res, 400, errorRef);
    }

    const [resultado] = await pool.query(
      `INSERT INTO agenda (hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede]
    );

    return responderOk(res, 201, {
      id: resultado.insertId,
      hora_entrada,
      hora_salida,
      fecha,
      id_medico: Number(id_medico),
      id_especialidad: Number(id_especialidad),
      id_sede: Number(id_sede),
    });
  } catch (error) {
    console.error("Error al crear agenda:", error);
    return responderError(res, 500, "Error interno al crear la agenda");
  }
}

// GET /agenda  -> listado/consulta, filtrable por medico, sede y fecha (query params)
//   El medico solo ve su propia agenda; el operador ve la de todos.
async function listar(req, res) {
  try {
    const { id_medico, id_sede, fecha } = req.query;

    const condiciones = [];
    const valores = [];

    // El medico queda forzado a ver unicamente su propia agenda.
    if (req.usuario.rol === "medico") {
      condiciones.push("a.id_medico = ?");
      valores.push(req.usuario.id);
    } else if (id_medico) {
      condiciones.push("a.id_medico = ?");
      valores.push(id_medico);
    }

    if (id_sede) {
      condiciones.push("a.id_sede = ?");
      valores.push(id_sede);
    }
    if (fecha) {
      condiciones.push("a.fecha = ?");
      valores.push(fecha);
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

    const [agenda] = await pool.query(
      `SELECT a.id, a.hora_entrada, a.hora_salida, a.fecha,
              a.id_medico, u.apellido AS medico_apellido, u.nombre AS medico_nombre,
              a.id_especialidad, e.descripcion AS especialidad,
              a.id_sede, s.nombre AS sede
         FROM agenda a
         JOIN usuario u ON u.id = a.id_medico
         JOIN especialidad e ON e.id = a.id_especialidad
         JOIN sede s ON s.id = a.id_sede
         ${where}
         ORDER BY a.fecha, a.hora_entrada`,
      valores
    );

    return responderOk(res, 200, agenda);
  } catch (error) {
    console.error("Error al listar agenda:", error);
    return responderError(res, 500, "Error interno al listar la agenda");
  }
}

// PUT /agenda/:id  -> modificacion de un rango horario de agenda
async function modificar(req, res) {
  try {
    const { id } = req.params;
    const { hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede } = req.body;

    if (!hora_entrada || !hora_salida || !fecha || !id_medico || !id_especialidad || !id_sede) {
      return responderError(res, 400, "Faltan datos obligatorios de la agenda");
    }

    // La agenda debe existir.
    const [existentes] = await pool.query(
      "SELECT id_medico, id_sede FROM agenda WHERE id = ?",
      [id]
    );
    if (existentes.length === 0) {
      return responderError(res, 404, "La agenda no existe");
    }
    const actual = existentes[0];

    // El medico solo puede modificar su propia agenda (ni el registro actual ni reasignarla a otro).
    if (req.usuario.rol === "medico") {
      if (actual.id_medico !== req.usuario.id || Number(id_medico) !== req.usuario.id) {
        return responderError(res, 403, "Un medico solo puede gestionar su propia agenda");
      }
    }
    // El operador solo puede modificar agenda de su sede (ni la actual ni moverla a otra).
    if (req.usuario.rol === "operador") {
      if (actual.id_sede !== req.usuario.id_sede || Number(id_sede) !== req.usuario.id_sede) {
        return responderError(res, 403, "Un operador solo puede gestionar la agenda de su sede");
      }
    }
    // La hora de salida debe ser posterior a la de entrada.
    if (hora_salida <= hora_entrada) {
      return responderError(res, 400, "La hora de salida debe ser posterior a la de entrada");
    }

    const errorRef = await validarReferencias(id_medico, id_especialidad, id_sede);
    if (errorRef) {
      return responderError(res, 400, errorRef);
    }

    // No se puede modificar dejando turnos confirmados fuera del nuevo horario/fecha.
    const [confirmados] = await pool.query(
      `SELECT DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha, hora
         FROM turno WHERE id_agenda = ? AND estado = 'confirmado'`,
      [id]
    );
    const hayFuera = confirmados.some(
      (t) => t.fecha !== fecha || t.hora < hora_entrada || t.hora >= hora_salida
    );
    if (hayFuera) {
      return responderError(res, 409, "No se puede modificar: hay turnos confirmados fuera del nuevo horario");
    }

    await pool.query(
      `UPDATE agenda
          SET hora_entrada = ?, hora_salida = ?, fecha = ?,
              id_medico = ?, id_especialidad = ?, id_sede = ?
        WHERE id = ?`,
      [hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede, id]
    );

    return responderOk(res, 200, { id: Number(id), actualizada: true });
  } catch (error) {
    console.error("Error al modificar agenda:", error);
    return responderError(res, 500, "Error interno al modificar la agenda");
  }
}

// DELETE /agenda/:id  -> baja de un rango horario de agenda
async function eliminar(req, res) {
  try {
    const { id } = req.params;

    const [existentes] = await pool.query(
      "SELECT id_medico, id_sede FROM agenda WHERE id = ?",
      [id]
    );
    if (existentes.length === 0) {
      return responderError(res, 404, "La agenda no existe");
    }
    const actual = existentes[0];

    // El medico solo puede eliminar su propia agenda.
    if (req.usuario.rol === "medico" && actual.id_medico !== req.usuario.id) {
      return responderError(res, 403, "Un medico solo puede gestionar su propia agenda");
    }
    // El operador solo puede eliminar agenda de su sede.
    if (req.usuario.rol === "operador" && actual.id_sede !== req.usuario.id_sede) {
      return responderError(res, 403, "Un operador solo puede gestionar la agenda de su sede");
    }

    // No se puede eliminar un rango con turnos confirmados.
    const [confirmados] = await pool.query(
      "SELECT COUNT(*) AS total FROM turno WHERE id_agenda = ? AND estado = 'confirmado'",
      [id]
    );
    if (confirmados[0].total > 0) {
      return responderError(res, 409, "No se puede eliminar: la agenda tiene turnos confirmados");
    }
    // Tampoco si tiene turnos cancelados/atendidos asociados (restriccion de integridad).
    const [turnos] = await pool.query(
      "SELECT COUNT(*) AS total FROM turno WHERE id_agenda = ?",
      [id]
    );
    if (turnos[0].total > 0) {
      return responderError(res, 409, "No se puede eliminar: la agenda tiene turnos asociados");
    }

    await pool.query("DELETE FROM agenda WHERE id = ?", [id]);
    return responderOk(res, 200, { id: Number(id), eliminada: true });
  } catch (error) {
    console.error("Error al eliminar agenda:", error);
    return responderError(res, 500, "Error interno al eliminar la agenda");
  }
}

module.exports = { crear, listar, modificar, eliminar };
