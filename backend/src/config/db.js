// Conexion a MySQL/MariaDB usando un pool de conexiones (mysql2/promise).
// Las credenciales se leen desde variables de entorno (.env).

const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Verifica que la conexion funcione al levantar el servidor.
async function probarConexion() {
  const conexion = await pool.getConnection();
  await conexion.ping();
  conexion.release();
}

module.exports = { pool, probarConexion };
