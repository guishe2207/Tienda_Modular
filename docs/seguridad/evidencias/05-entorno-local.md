# Disponibilidad final del entorno local

Docker Desktop respondió correctamente. El contenedor aislado `tienda-modular-postgres` existía detenido, se inició sin tocar otros contenedores y atendió exclusivamente en `127.0.0.1:5433`; se aplicaron esquema, semilla y migración de usuarios/roles.

Se instaló `mkcert`, su CA local y un certificado para `localhost`, `127.0.0.1` y `::1` en `backend/certs/`, ruta ignorada por Git. Node verificó el certificado con la CA de mkcert (`CERT_AUTHORIZED=true`); HTTPS 3443 respondió 200 y HTTP 3000 respondió 308. Chrome headless generó la captura de catálogo/XSS.
