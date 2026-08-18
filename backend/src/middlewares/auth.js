// Middlewares de seguridad (Semana 1).
//   verificarToken: valida el JWT (401 si falta o es invalido/vencido).
//   verificarRol(...roles): valida que el rol del usuario este permitido (403 si no).

const jwt = require("jsonwebtoken");
const { responderError } = require("../utils/respuesta");

function verificarToken(req, res, next) {
  const header = req.headers["authorization"];

  if (!header || !header.startsWith("Bearer ")) {
    return responderError(res, 401, "Token no provisto");
  }

  const token = header.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Guardamos los datos del usuario autenticado para usarlos en los controllers.
    req.usuario = payload; // { id, rol, id_sede }
    next();
  } catch (error) {
    return responderError(res, 401, "Token invalido o vencido");
  }
}

function verificarRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return responderError(res, 401, "No autenticado");
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return responderError(res, 403, "No tenes permisos para esta accion");
    }
    next();
  };
}

module.exports = { verificarToken, verificarRol };
