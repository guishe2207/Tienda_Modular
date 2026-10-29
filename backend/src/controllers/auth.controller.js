const service = require('../services/auth.service');

async function login(request, response) {
  const { usuario, password } = request.validatedBody;
  try {
    const session = await service.login(usuario, password);
    request.loginRateLimit?.success();
    const secure = request.app.locals.cookiesSecure;
    response.cookie('tm_session', session.token, { httpOnly: true, secure, sameSite: 'strict', maxAge: 15 * 60 * 1000, path: '/' });
    response.cookie('tm_csrf', session.csrfToken, { httpOnly: false, secure, sameSite: 'strict', maxAge: 15 * 60 * 1000, path: '/' });
    response.json({ data: { usuario: session.usuario, rol: session.rol, expiraEn: session.expiraEn } });
  } catch (error) {
    if (error.status === 401) request.loginRateLimit?.failure();
    throw error;
  }
}

async function logout(request, response) {
  await service.logout(request.token);
  response.clearCookie('tm_session', { httpOnly: true, secure: request.app.locals.cookiesSecure, sameSite: 'strict', path: '/' });
  response.clearCookie('tm_csrf', { httpOnly: false, secure: request.app.locals.cookiesSecure, sameSite: 'strict', path: '/' });
  response.status(204).end();
}

async function sesion(request, response) {
  response.json({ data: request.admin });
}

async function registro(request, response) {
  const { usuario, password } = request.validatedBody;
  const user = await service.registrar(usuario, password);
  response.status(201).json({ data: { idUsuario: user.idUsuario, usuario: user.usuario, rol: user.rol } });
}

module.exports = { login, logout, sesion, registro };
