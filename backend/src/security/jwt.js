const crypto = require('node:crypto');
const { jwtSecret } = require('../config/env');

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function sign(payload) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const signature = crypto.createHmac('sha256', jwtSecret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verify(token) {
  const [header, body, signature, extra] = String(token).split('.');
  if (!header || !body || !signature || extra) return null;
  const expected = crypto.createHmac('sha256', jwtSecret).update(`${header}.${body}`).digest('base64url');
  const supplied = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (supplied.length !== expectedBuffer.length || !crypto.timingSafeEqual(supplied, expectedBuffer)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload || payload.exp * 1000 <= Date.now() || !Number.isSafeInteger(payload.sub) || !['admin', 'cliente'].includes(payload.rol)) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = { sign, verify };
