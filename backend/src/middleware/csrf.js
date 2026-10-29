const crypto = require('node:crypto');
const { AppError } = require('./errors');

function crearTokenCsrf() {
  return crypto.randomBytes(32).toString('base64url');
}

function requireCsrf(request, response, next) {
  const received = request.get('X-CSRF-Token') || '';
  const expected = request.cookies?.tm_csrf || '';
  const valid = Boolean(expected) && received.length === expected.length
    && crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  if (!valid) {
    return next(new AppError(403, 'CSRF_TOKEN_INVALID', 'El encabezado X-CSRF-Token falta o no es valido.'));
  }
  next();
}

module.exports = { crearTokenCsrf, requireCsrf };
