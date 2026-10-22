// Controller de pacientes (ampliacion para el frontend).
//   - buscar:            busqueda por DNI o apellido (operador / medico / admin).
//   - actualizarMisDatos: el paciente edita SOLO email, contrasena, telefono y
//                         cobertura (el resto de sus datos es de solo lectura).

const bcrypt = require("bcrypt");
const { pool } = require("../config/db");
const { responderOk, responderError } = require("../utils/respuesta");

const SALT_ROUNDS = 10;

// GET /pacientes?busqueda=  -> busca pacientes por DNI o apellido
async function buscar(req, res) {
  try {
    const busqueda = (req.query.busqueda || "").trim();

    const [pacientes] = await pool.query(
      `SELECT u.id, u.nombre, u.apellido, u.dni, u.email, u.telefono,
              DATE_FORMAT(u.fecha_nacimiento, '%Y-%m-%d') AS fecha_nacimiento,
              u.id_cobertura, c.nombre AS cobertura
         FROM usuario u
         LEFT JOIN cobertura c ON c.id = u.id_cobertura
        WHERE u.rol = 'paciente'
          AND (? = '' OR u.dni LIKE ? OR u.apellido LIKE ?)
        ORDER BY u.apellido, u.nombre
        LIMIT 50`,
      [busqueda, `%${busqueda}%`, `%${busqueda}%`]
    );

    return responderOk(res, 200, pacientes);
  } catch (error) {
    console.error("Error al buscar pacientes:", error);
    return responderError(res, 500, "Error interno al buscar pacientes");
  }
}

// PUT /pacientes/mis-datos  -> el paciente actualiza sus datos editables
async function actualizarMisDatos(req, res) {
  try {
    const { email, telefono, id_cobertura, password } = req.body;

    if (!email || !telefono || !id_cobertura) {
      return responderError(res, 400, "Email, telefono y cobertura son obligatorios");
    }

    // El email no puede pisar el de otro usuario.
    const [duplicados] = await pool.query(
      "SELECT id FROM usuario WHERE email = ? AND id <> ?",
      [email, req.usuario.id]
    );
    if (duplicados.length > 0) {
      return responderError(res, 409, "El email ya esta registrado en otra cuenta");
    }

    // La cobertura elegida debe existir.
    const [coberturas] = await pool.query("SELECT id FROM cobertura WHERE id = ?", [id_cobertura]);
    if (coberturas.length === 0) {
      return responderError(res, 400, "La cobertura indicada no existe");
    }

    const campos = ["email = ?", "telefono = ?", "id_cobertura = ?"];
    const valores = [email, telefono, id_cobertura];
    if (password) {
      campos.push("password = ?");
      valores.push(await bcrypt.hash(password, SALT_ROUNDS));
    }
    valores.push(req.usuario.id);

    await pool.query(`UPDATE usuario SET ${campos.join(", ")} WHERE id = ?`, valores);

    return responderOk(res, 200, { id: req.usuario.id, actualizado: true });
  } catch (error) {
    console.error("Error al actualizar datos del paciente:", error);
    return responderError(res, 500, "Error interno al actualizar los datos");
  }
}

module.exports = { buscar, actualizarMisDatos };
