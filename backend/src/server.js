const app = require('./app');
const fs = require('node:fs');
const https = require('node:https');
const pool = require('./config/database');
const { https: httpsConfig, port, production } = require('./config/env');

const server = httpsConfig.enabled
  ? https.createServer({ key: fs.readFileSync(httpsConfig.keyPath), cert: fs.readFileSync(httpsConfig.certPath) }, app).listen(httpsConfig.port, iniciar)
  : app.listen(port, iniciar);

let redirectServer;
if (httpsConfig.enabled && !production) {
  const http = require('node:http');
  redirectServer = http.createServer((request, response) => {
    response.writeHead(308, { Location: `https://localhost:${httpsConfig.port}${request.url}` });
    response.end();
  }).listen(port);
}

function iniciar() {
  const protocol = httpsConfig.enabled ? 'https' : 'http';
  const activePort = httpsConfig.enabled ? httpsConfig.port : port;
  console.log(`API disponible en ${protocol}://localhost:${activePort}`);
  console.log(`Swagger disponible en ${protocol}://localhost:${activePort}/api-docs`);
}

function shutdown() {
  server.close(async () => {
    redirectServer?.close();
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
