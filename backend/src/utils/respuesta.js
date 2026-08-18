// Helpers para la estructura de respuesta uniforme exigida por el enunciado:
//   { codigo, estado, datos }
// Se usa en TODOS los endpoints, tanto en exito como en error.

function responderOk(res, codigo, datos = null, estado = "ok") {
  return res.status(codigo).json({
    codigo,
    estado,
    datos,
  });
}

function responderError(res, codigo, mensaje) {
  return res.status(codigo).json({
    codigo,
    estado: mensaje,
    datos: null,
  });
}

module.exports = { responderOk, responderError };
