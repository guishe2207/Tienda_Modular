const { AppError } = require('./errors');

const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function keyFor(request) {
  // No se confia en X-Forwarded-For: Express conserva trust proxy desactivado.
  return `${request.ip}:${String(request.body?.usuario || '').trim().toLowerCase()}`;
}

function loginRateLimit(request, response, next) {
  const key = keyFor(request);
  const now = Date.now();
  const record = attempts.get(key);
  if (record && record.resetAt > now && record.count >= MAX_ATTEMPTS) {
    response.set('Retry-After', String(Math.ceil((record.resetAt - now) / 1000)));
    return next(new AppError(429, 'LOGIN_RATE_LIMITED', 'Demasiados intentos de inicio de sesion. Intenta de nuevo en 15 minutos.'));
  }
  request.loginRateLimit = {
    success() { attempts.delete(key); },
    failure() {
      const current = attempts.get(key);
      if (!current || current.resetAt <= now) attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
      else current.count += 1;
    },
  };
  next();
}

function resetLoginRateLimitForTests() { attempts.clear(); }

module.exports = { loginRateLimit, resetLoginRateLimitForTests, MAX_ATTEMPTS };
