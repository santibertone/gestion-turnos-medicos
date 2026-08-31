// Middleware de auditoria (Semana 4).
// Registra automaticamente en `log_auditoria` cada alta/baja/modificacion sobre
// las entidades sensibles (usuarios, coberturas, especialidades, sedes), SIN
// repetir codigo en cada controller: se aplica una sola vez a nivel de ruta.
//
// Uso:  router.post("/", auditar("sede"), crear)
//       o dentro de un router.use(...) que agrupa el CRUD.
//
// Deriva la accion del metodo HTTP (POST -> ALTA, PUT -> MODIFICACION,
// DELETE -> BAJA) y solo registra si la operacion respondio con exito (2xx),
// de modo que un 400/404/409 no ensucia el log.

const { pool } = require("../config/db");

// Mapa metodo HTTP -> tipo de accion auditada.
const ACCIONES = { POST: "ALTA", PUT: "MODIFICACION", DELETE: "BAJA" };

// Inserta el registro de auditoria en su propio try/catch: si algo falla,
// se loguea por consola pero NUNCA rompe la respuesta al cliente.
async function registrarLog(idUsuario, accion, entidad, idEntidad, detalle) {
  try {
    await pool.query(
      "INSERT INTO log_auditoria (id_usuario, accion, entidad, id_entidad, detalle) VALUES (?, ?, ?, ?, ?)",
      [idUsuario, accion, entidad, idEntidad, detalle]
    );
  } catch (error) {
    console.error("No se pudo registrar la auditoria:", error);
  }
}

// Arma un detalle legible a partir de lo que se sabe de la operacion.
function construirDetalle(accion, entidad, datos, body) {
  const nombre =
    (body && (body.nombre || body.descripcion)) ||
    (datos && (datos.nombre || datos.descripcion)) ||
    (body && body.apellido && body.nombre ? `${body.apellido} ${body.nombre}` : null);
  const idTxt = datos && datos.id ? ` #${datos.id}` : "";
  const nombreTxt = nombre ? ` (${nombre})` : "";
  return `${accion} de ${entidad}${idTxt}${nombreTxt}`;
}

function auditar(entidad) {
  return (req, res, next) => {
    const accion = ACCIONES[req.method];
    // Los GET (y cualquier metodo no mutante) no se auditan.
    if (!accion) return next();

    // Interceptamos res.json para registrar recien cuando el controller respondio.
    const jsonOriginal = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const datos = body && body.datos ? body.datos : null;
        const idEntidad =
          (datos && datos.id) || (req.params && req.params.id) || null;
        // Actor: el usuario autenticado; en el auto-registro (ruta publica) no hay
        // token, asi que el actor es el propio usuario recien creado.
        const idUsuario =
          (req.usuario && req.usuario.id) || (datos && datos.id) || null;
        const detalle = construirDetalle(accion, entidad, datos, req.body);

        if (idUsuario) {
          registrarLog(idUsuario, accion, entidad, idEntidad, detalle);
        }
      }
      return jsonOriginal(body);
    };

    next();
  };
}

module.exports = { auditar };
