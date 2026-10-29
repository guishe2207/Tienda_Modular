const crypto = require('node:crypto');
const usuarios = require('../models/usuarios.model');
const sesiones = require('../models/sesiones.model');
const { hashPassword, verifyPassword } = require('../security/password');
const { AppError } = require('../middleware/errors');
const { crearTokenCsrf } = require('../middleware/csrf');
const { sign, verify } = require('../security/jwt');

const DURACION_SESION_MS = 15 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function login(usuario, password) {
  const registro = await usuarios.buscarPorUsuario(usuario);
  // Mismo mensaje si el usuario no existe o la contrasena es incorrecta, para no revelar cuentas.
  if (!registro || !verifyPassword(password, registro.passwordHash)) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Usuario o contrasena incorrectos.');
  }

  const csrfToken = crearTokenCsrf();
  const expiraEn = new Date(Date.now() + DURACION_SESION_MS);
  const token = sign({ sub: registro.idUsuario, usuario: registro.usuario, rol: registro.rol, exp: Math.floor(expiraEn.getTime() / 1000), csrf: crypto.createHash('sha256').update(csrfToken).digest('base64url') });
  await sesiones.eliminarExpiradas();
  await sesiones.crear(hashToken(token), registro.idUsuario, expiraEn);

  return { token, csrfToken, usuario: registro.usuario, rol: registro.rol, expiraEn: expiraEn.toISOString() };
}

async function registrar(usuario, password) {
  const existente = await usuarios.buscarPorUsuario(usuario);
  if (existente) throw new AppError(409, 'USER_EXISTS', 'El usuario ya existe.');
  try {
    return await usuarios.crear(usuario, hashPassword(password));
  } catch (error) {
    if (error.code === '23505') throw new AppError(409, 'USER_EXISTS', 'El usuario ya existe.');
    throw error;
  }
}

async function logout(token) {
  await sesiones.eliminar(hashToken(token));
}

async function verificarToken(token) {
  const payload = verify(token);
  if (!payload) return null;
  const sesion = await sesiones.buscarActiva(hashToken(token));
  if (!sesion || sesion.idUsuario !== payload.sub || sesion.rol !== payload.rol) return null;
  return sesion;
}

module.exports = { login, logout, verificarToken, registrar };
