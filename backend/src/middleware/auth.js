const authService = require('../services/auth.service');
const { AppError } = require('./errors');

async function requireAuth(request, response, next) {
  const token = request.cookies?.tm_session || '';
  if (!token) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Inicia sesion como administrador para realizar esta accion.'));
  }

  const sesion = await authService.verificarToken(token);
  if (!sesion) {
    return next(new AppError(401, 'UNAUTHORIZED', 'La sesion no es valida o ya expiro.'));
  }

  request.token = token;
  request.user = { idUsuario: sesion.idUsuario, usuario: sesion.usuario, rol: sesion.rol };
  request.admin = request.user;
  next();
}

async function optionalAuth(request, response, next) {
  const token = request.cookies?.tm_session || '';
  if (!token) return next();
  const sesion = await authService.verificarToken(token);
  if (!sesion) return next(new AppError(401, 'UNAUTHORIZED', 'La sesion no es valida o ya expiro.'));
  request.token = token;
  request.user = { idUsuario: sesion.idUsuario, usuario: sesion.usuario, rol: sesion.rol };
  request.admin = request.user;
  next();
}

function requireRole(...roles) {
  return (request, response, next) => roles.includes(request.user?.rol)
    ? next()
    : next(new AppError(403, 'FORBIDDEN', 'No tienes permisos para realizar esta accion.'));
}

module.exports = { requireAuth, optionalAuth, requireRole };
