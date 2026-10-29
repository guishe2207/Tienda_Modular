# Pruebas backend reales

Comando: `npm --prefix backend run check; npm --prefix backend test`.

Resultado final: `node --check src/server.js` correcto; 17 pruebas aprobadas, 0 fallos, 0 omitidas. Duración: 503.2415 ms.

Las pruebas cubrieron Swagger, validación, 401 sin sesión, sexto intento 429, CSRF válido e inválido, Helmet/CSP, hash de contraseña, CORS y ocultamiento de errores internos.

Nota de ejecución: el aislamiento de Windows impedía lanzar el runner de Node (`spawn EPERM`); se ejecutó la misma suite local fuera de ese aislamiento. No se accedió a producción.
