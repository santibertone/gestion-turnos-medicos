// Controller de gestion de usuarios (rol administrador).
//   - listar:    listado paginado con filtros (nombre, apellido, rol, sede).
//   - crear:     alta de operador / medico / administrador (+ especialidades del medico).
//   - modificar: edicion de cualquier usuario, incluidos pacientes y las
//                especialidades del medico.
// Cada alta/modificacion queda auditada por el middleware `auditar("usuario")`.

const bcrypt = require("bcrypt");
const { pool } = require("../config/db");
const { responderOk, responderError } = require("../utils/respuesta");

const SALT_ROUNDS = 10;
const ROLES_ALTA = ["operador", "medico", "admin", "administrador"];

// Sincroniza las especialidades de un medico (borra las actuales e inserta las nuevas).
async function sincronizarEspecialidades(idMedico, especialidades) {
  await pool.query("DELETE FROM medico_especialidad WHERE id_medico = ?", [idMedico]);
  for (const idEsp of especialidades) {
    await pool.query(
      "INSERT INTO medico_especialidad (id_medico, id_especialidad) VALUES (?, ?)",
      [idMedico, idEsp]
    );
  }
}

// GET /usuarios?nombre=&apellido=&rol=&id_sede=&pagina=&limite=
async function listar(req, res) {
  try {
    const { nombre, apellido, rol, id_sede } = req.query;
    const pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
    const limite = Math.max(1, Math.min(100, parseInt(req.query.limite, 10) || 10));
    const offset = (pagina - 1) * limite;

    const condiciones = [];
    const valores = [];
    if (nombre) {
      condiciones.push("u.nombre LIKE ?");
      valores.push(`%${nombre}%`);
    }
    if (apellido) {
      condiciones.push("u.apellido LIKE ?");
      valores.push(`%${apellido}%`);
    }
    if (rol) {
      condiciones.push("u.rol = ?");
      valores.push(rol);
    }
    if (id_sede) {
      condiciones.push("u.id_sede = ?");
      valores.push(id_sede);
    }
    const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM usuario u ${where}`,
      valores
    );

    const [usuarios] = await pool.query(
      `SELECT u.id, u.nombre, u.apellido, u.dni, u.email, u.telefono,
              DATE_FORMAT(u.fecha_nacimiento, '%Y-%m-%d') AS fecha_nacimiento,
              u.rol, u.id_sede, s.nombre AS sede,
              u.id_cobertura, c.nombre AS cobertura
         FROM usuario u
         LEFT JOIN sede s ON s.id = u.id_sede
         LEFT JOIN cobertura c ON c.id = u.id_cobertura
         ${where}
        ORDER BY u.apellido, u.nombre
        LIMIT ? OFFSET ?`,
      [...valores, limite, offset]
    );

    // Especialidades de los medicos de la pagina.
    const idsMedicos = usuarios.filter((u) => u.rol === "medico").map((u) => u.id);
    if (idsMedicos.length) {
      const [esp] = await pool.query(
        `SELECT me.id_medico, e.id, e.descripcion
           FROM medico_especialidad me
           JOIN especialidad e ON e.id = me.id_especialidad
          WHERE me.id_medico IN (?)`,
        [idsMedicos]
      );
      const porMedico = new Map();
      for (const row of esp) {
        if (!porMedico.has(row.id_medico)) porMedico.set(row.id_medico, []);
        porMedico.get(row.id_medico).push({ id: row.id, descripcion: row.descripcion });
      }
      for (const u of usuarios) {
        if (u.rol === "medico") u.especialidades = porMedico.get(u.id) || [];
      }
    }

    return responderOk(res, 200, { total, pagina, limite, usuarios });
  } catch (error) {
    console.error("Error al listar usuarios:", error);
    return responderError(res, 500, "Error interno al listar usuarios");
  }
}

// POST /usuarios  -> alta de operador / medico / administrador
async function crear(req, res) {
  try {
    const {
      nombre, apellido, dni, email, password, fecha_nacimiento,
      rol, id_sede, telefono, especialidades,
    } = req.body;

    if (!nombre || !apellido || !dni || !email || !password || !fecha_nacimiento || !rol) {
      return responderError(res, 400, "Faltan datos obligatorios del usuario");
    }
    if (!ROLES_ALTA.includes(rol)) {
      return responderError(res, 400, "El rol debe ser operador, medico o administrador");
    }

    const esAdmin = rol === "admin" || rol === "administrador";
    // Operador y medico tienen sede; el administrador no.
    if (!esAdmin && !id_sede) {
      return responderError(res, 400, "El operador y el medico deben tener una sede asignada");
    }
    if (rol === "medico" && (!Array.isArray(especialidades) || especialidades.length === 0)) {
      return responderError(res, 400, "El medico debe tener al menos una especialidad");
    }

    const [existentes] = await pool.query(
      "SELECT id FROM usuario WHERE dni = ? OR email = ?",
      [dni, email]
    );
    if (existentes.length > 0) {
      return responderError(res, 409, "El DNI o el email ya estan registrados");
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const sedeFinal = esAdmin ? null : id_sede;

    const [resultado] = await pool.query(
      `INSERT INTO usuario
         (apellido, nombre, fecha_nacimiento, password, rol, email, telefono, dni, id_sede, id_cobertura)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [apellido, nombre, fecha_nacimiento, passwordHash, rol, email, telefono || "", dni, sedeFinal]
    );

    if (rol === "medico") {
      await sincronizarEspecialidades(resultado.insertId, especialidades);
    }

    return responderOk(res, 201, {
      id: resultado.insertId, nombre, apellido, rol,
    });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return responderError(res, 500, "Error interno al crear el usuario");
  }
}

// PUT /usuarios/:id  -> edicion de cualquier usuario (incluidos pacientes)
async function modificar(req, res) {
  try {
    const { id } = req.params;
    const {
      nombre, apellido, dni, email, fecha_nacimiento,
      telefono, id_sede, id_cobertura, password, especialidades,
    } = req.body;

    const [usuarios] = await pool.query("SELECT id, rol FROM usuario WHERE id = ?", [id]);
    if (usuarios.length === 0) {
      return responderError(res, 404, "El usuario no existe");
    }
    const usuario = usuarios[0];

    if (!nombre || !apellido || !dni || !email || !fecha_nacimiento) {
      return responderError(res, 400, "Faltan datos obligatorios del usuario");
    }

    // DNI/email unicos (excluyendo al propio usuario).
    const [duplicados] = await pool.query(
      "SELECT id FROM usuario WHERE (dni = ? OR email = ?) AND id <> ?",
      [dni, email, id]
    );
    if (duplicados.length > 0) {
      return responderError(res, 409, "El DNI o el email ya estan registrados en otro usuario");
    }

    const esAdmin = usuario.rol === "admin" || usuario.rol === "administrador";
    const sedeFinal = esAdmin ? null : id_sede ?? null;
    const coberturaFinal = usuario.rol === "paciente" ? id_cobertura ?? null : null;

    const campos = [
      "apellido = ?", "nombre = ?", "fecha_nacimiento = ?", "email = ?",
      "telefono = ?", "dni = ?", "id_sede = ?", "id_cobertura = ?",
    ];
    const valores = [apellido, nombre, fecha_nacimiento, email, telefono || "", dni, sedeFinal, coberturaFinal];

    // La contrasena se actualiza solo si se envia (siempre hasheada).
    if (password) {
      campos.push("password = ?");
      valores.push(await bcrypt.hash(password, SALT_ROUNDS));
    }
    valores.push(id);

    await pool.query(`UPDATE usuario SET ${campos.join(", ")} WHERE id = ?`, valores);

    // Especialidades del medico.
    if (usuario.rol === "medico" && Array.isArray(especialidades)) {
      await sincronizarEspecialidades(id, especialidades);
    }

    return responderOk(res, 200, { id: Number(id), nombre, apellido, rol: usuario.rol });
  } catch (error) {
    console.error("Error al modificar usuario:", error);
    return responderError(res, 500, "Error interno al modificar el usuario");
  }
}

module.exports = { listar, crear, modificar };
