// Helper interno de notificaciones (Semana 3).
// Las notificaciones NO se crean por un endpoint publico: se generan
// internamente cada vez que ocurre un evento de turno (confirmacion,
// cancelacion o atencion). Por eso vive como utilitario y se invoca desde
// el controller de turnos.
//
// Cada notificacion se guarda siempre con leida = 0; la fecha la completa
// automaticamente la base (DEFAULT CURRENT_TIMESTAMP).

const { pool } = require("../config/db");

// Inserta una notificacion para un usuario destinatario.
// Se envuelve en try/catch propio: si fallara el registro de la notificacion,
// NO debe tumbar la operacion principal (el turno ya cambio de estado).
async function crearNotificacion(id_usuario, tipo, mensaje) {
  try {
    await pool.query(
      "INSERT INTO notificacion (id_usuario, tipo, mensaje, leida) VALUES (?, ?, ?, 0)",
      [id_usuario, tipo, mensaje]
    );
  } catch (error) {
    console.error("No se pudo registrar la notificacion:", error);
  }
}

module.exports = { crearNotificacion };
