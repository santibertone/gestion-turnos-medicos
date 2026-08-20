// Controller de autenticacion (Semana 1): registro, login y perfil.

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const { responderOk, responderError } = require("../utils/respuesta");

const SALT_ROUNDS = 10;

// POST /auth/registro  -> alta de PACIENTE
async function registro(req, res) {
  try {
    const {
      nombre,
      apellido,
      dni,
      email,
      password,
      fecha_nacimiento,
      id_cobertura,
    } = req.body;

    // Validacion basica de campos requeridos.
    if (!nombre || !apellido || !dni || !email || !password || !fecha_nacimiento || !id_cobertura) {
      return responderError(res, 400, "Faltan datos obligatorios");
    }

    // DNI y email no pueden estar duplicados.
    const [existentes] = await pool.query(
      "SELECT id FROM usuario WHERE dni = ? OR email = ?",
      [dni, email]
    );
    if (existentes.length > 0) {
      return responderError(res, 409, "El DNI o el email ya estan registrados");
    }

    // La cobertura elegida debe existir.
    const [coberturas] = await pool.query(
      "SELECT id FROM cobertura WHERE id = ?",
      [id_cobertura]
    );
    if (coberturas.length === 0) {
      return responderError(res, 400, "La cobertura indicada no existe");
    }

    // Hasheo de la contraseña con bcrypt (nunca texto plano).
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [resultado] = await pool.query(
      `INSERT INTO usuario
         (apellido, nombre, fecha_nacimiento, password, rol, email, telefono, dni, id_sede, id_cobertura)
       VALUES (?, ?, ?, ?, 'paciente', ?, ?, ?, NULL, ?)`,
      [apellido, nombre, fecha_nacimiento, passwordHash, email, req.body.telefono || "", dni, id_cobertura]
    );

    return responderOk(res, 201, { id: resultado.insertId, rol: "paciente" });
  } catch (error) {
    console.error("Error en registro:", error);
    return responderError(res, 500, "Error interno al registrar el usuario");
  }
}

// POST /auth/login  -> valida dni + password y devuelve JWT
async function login(req, res) {
  try {
    const { dni, password } = req.body;

    if (!dni || !password) {
      return responderError(res, 400, "Debe enviar dni y contraseña");
    }

    const [usuarios] = await pool.query(
      "SELECT id, password, rol, id_sede FROM usuario WHERE dni = ?",
      [dni]
    );
    if (usuarios.length === 0) {
      return responderError(res, 401, "Credenciales invalidas");
    }

    const usuario = usuarios[0];
    const passwordOk = await bcrypt.compare(password, usuario.password);
    if (!passwordOk) {
      return responderError(res, 401, "Credenciales invalidas");
    }

    // El token incluye id, rol e id_sede (si aplica).
    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol, id_sede: usuario.id_sede },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    return responderOk(res, 200, { token });
  } catch (error) {
    console.error("Error en login:", error);
    return responderError(res, 500, "Error interno al iniciar sesion");
  }
}

// GET /auth/perfil  -> endpoint protegido; devuelve datos del usuario del token
async function perfil(req, res) {
  try {
    const [usuarios] = await pool.query(
      `SELECT id, nombre, apellido, dni, email, telefono, fecha_nacimiento,
              rol, id_sede, id_cobertura
         FROM usuario WHERE id = ?`,
      [req.usuario.id]
    );
    if (usuarios.length === 0) {
      return responderError(res, 404, "Usuario no encontrado");
    }
    return responderOk(res, 200, usuarios[0]);
  } catch (error) {
    console.error("Error en perfil:", error);
    return responderError(res, 500, "Error interno al obtener el perfil");
  }
}

module.exports = { registro, login, perfil };
