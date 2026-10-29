/* Pruebas de integración contra el laboratorio HTTPS local. No imprime secretos. */
const fs = require('node:fs');
const https = require('node:https');
const path = require('node:path');
const crypto = require('node:crypto');
const { sign } = require('../src/security/jwt');

const agent = new https.Agent({ rejectUnauthorized: false });
const baseOptions = { hostname: 'localhost', port: 3443, agent };
const results = [];
const suffix = Date.now().toString(36);
const adminUser = process.env.SECURITY_TEST_ADMIN_USER;
const adminPassword = process.env.SECURITY_TEST_ADMIN_PASSWORD;
const clientPassword = process.env.SECURITY_TEST_CLIENT_PASSWORD;

function request(method, route, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : JSON.stringify(body);
    const req = https.request({ ...baseOptions, method, path: route, headers: {
      ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
      ...headers,
    } }, (response) => {
      let raw = '';
      response.on('data', (chunk) => { raw += chunk; });
      response.on('end', () => {
        let json;
        try { json = raw ? JSON.parse(raw) : null; } catch { json = null; }
        resolve({ status: response.statusCode, headers: response.headers, json });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function cookies(response) {
  return (response.headers['set-cookie'] || []).map((value) => value.split(';')[0]).join('; ');
}
function csrf(cookiesHeader) {
  return decodeURIComponent((cookiesHeader.match(/tm_csrf=([^;]+)/) || [])[1] || '');
}
function expect(name, response, status) {
  const ok = response.status === status;
  results.push({ prueba: name, esperado: status, obtenido: response.status, resultado: ok ? 'OK' : 'FALLO' });
  if (!ok) throw new Error(`${name}: esperaba ${status}, obtuvo ${response.status}`);
}
async function login(usuario, password) {
  const response = await request('POST', '/api/auth/login', { usuario, password });
  expect(`login ${usuario}`, response, 200);
  const sessionCookies = cookies(response);
  const attributes = (response.headers['set-cookie'] || []).join('; ');
  if (!/HttpOnly/.test(attributes) || !/Secure/.test(attributes) || !/SameSite=Strict/.test(attributes)) throw new Error('Atributos de cookie de sesión incompletos');
  return { cookie: sessionCookies, csrf: csrf(sessionCookies) };
}
async function main() {
  if (!adminUser || !adminPassword || !clientPassword) throw new Error('Faltan SECURITY_TEST_ADMIN_USER, SECURITY_TEST_ADMIN_PASSWORD o SECURITY_TEST_CLIENT_PASSWORD.');
  const admin = await login(adminUser, adminPassword);
  const health = await request('GET', '/api/health'); expect('HTTPS health', health, 200);
  if (!String(health.headers['strict-transport-security']).includes('max-age=300')) throw new Error('HSTS local no encontrado');
  const unauth = await request('POST', '/api/productos', { nombre: 'x' }); expect('escritura sin sesión', unauth, 401);
  const csrfMissing = await request('POST', '/api/categorias', { nombre: 'CSRF local' }, { Cookie: admin.cookie }); expect('CSRF ausente', csrfMissing, 403);
  const category = await request('POST', '/api/categorias', { nombre: `Prueba seguridad ${suffix}`, descripcion: 'Evidencia local' }, { Cookie: admin.cookie, 'X-CSRF-Token': admin.csrf }); expect('CSRF válido', category, 201);
  const xssProduct = await request('POST', '/api/productos', { nombre: `XSS <img src=x onerror=alert(1)> ${suffix}`, descripcion: '<script>alert(1)</script>', precio: 12345, stock: 1, idCategoria: category.json.data.idCategoria }, { Cookie: admin.cookie, 'X-CSRF-Token': admin.csrf }); expect('carga XSS almacenada para renderizado seguro', xssProduct, 201);
  const registration = await request('POST', '/api/auth/registro', { usuario: `cliente_a_${suffix}`, password: clientPassword }); expect('registro cliente', registration, 201);
  const elevation = await request('POST', '/api/auth/registro', { usuario: `elevacion_${suffix}`, password: clientPassword, rol: 'admin' }); expect('elevación de privilegios', elevation, 400);
  await request('POST', '/api/auth/registro', { usuario: `cliente_b_${suffix}`, password: clientPassword });
  const clientA = await login(`cliente_a_${suffix}`, clientPassword);
  const adminWrite = await request('POST', '/api/productos', { nombre: 'No permitido', precio: 1, stock: 1, idCategoria: 1 }, { Cookie: clientA.cookie, 'X-CSRF-Token': clientA.csrf }); expect('cliente no administra', adminWrite, 403);
  const invalidQuantity = await request('POST', '/api/pedidos', { nombre: 'Prueba', correo: 'prueba@example.test', telefono: '3000000000', direccion: 'Calle 1', ciudad: 'Bogota', departamento: 'Bogota', items: [{ idProducto: 1, cantidad: -1 }], claveIdempotencia: '11111111-1111-4111-8111-111111111111' }); expect('cantidad negativa', invalidQuantity, 400);
  const catalog = await request('GET', '/api/productos'); expect('catálogo público', catalog, 200);
  const product = catalog.json.data[0];
  const order = await request('POST', '/api/pedidos', { nombre: 'Prueba', correo: 'prueba@example.test', telefono: '3000000000', direccion: 'Calle 1', ciudad: 'Bogota', departamento: 'Bogota', items: [{ idProducto: product.idProducto, cantidad: 1, precio: 1 }], claveIdempotencia: crypto.randomUUID() }, { Cookie: clientA.cookie, 'X-CSRF-Token': clientA.csrf }); expect('pedido autenticado / precio servidor', order, 201);
  if (order.json.data.total !== product.precio) throw new Error('El precio no fue calculado desde PostgreSQL');
  const clientB = await login(`cliente_b_${suffix}`, clientPassword);
  const idor = await request('GET', `/api/pedidos/${order.json.data.idPedido}`, undefined, { Cookie: clientB.cookie }); expect('IDOR pedido ajeno', idor, 404);
  const expired = sign({ sub: 1, usuario: 'expired', rol: 'admin', exp: Math.floor(Date.now() / 1000) - 1 });
  const expiredResponse = await request('GET', '/api/auth/sesion', undefined, { Cookie: `tm_session=${expired}` }); expect('JWT expirado', expiredResponse, 401);
  for (let i = 0; i < 5; i += 1) await request('POST', '/api/auth/login', { usuario: `limite_${suffix}`, password: 'incorrecta' });
  const limited = await request('POST', '/api/auth/login', { usuario: `limite_${suffix}`, password: 'incorrecta' }); expect('sexto login fallido', limited, 429);
  const cors = await request('GET', '/api/productos', undefined, { Origin: 'http://localhost:4300' }); expect('CORS no autorizado', cors, 403);
  const csp = await request('GET', '/api-docs/'); expect('Helmet/CSP', csp, 200);
  if (!String(csp.headers['content-security-policy']).includes("default-src 'self'")) throw new Error('CSP no encontrada');
  fs.writeFileSync(path.join(__dirname, '../../docs/seguridad/evidencias/06-pruebas-http-local.json'), `${JSON.stringify({ fecha: new Date().toISOString(), resultados: results }, null, 2)}\n`);
  console.log(`PRUEBAS_OK=${results.length}`);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
