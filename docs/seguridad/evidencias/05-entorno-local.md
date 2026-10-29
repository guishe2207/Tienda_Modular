# Disponibilidad del entorno local

Docker Desktop no estaba iniciado: la conexión a `dockerDesktopLinuxEngine` falló. `mkcert` no estaba disponible en PATH. Por ello no se generó certificado, no se levantó PostgreSQL local y no se ejecutaron pruebas HTTP de login real, límite 429, IDOR o checkout contra base de datos.

El código deja preparada la configuración HTTPS local: `HTTPS_ENABLED=true`, certificado mkcert en rutas ignoradas por Git, HTTPS 3443, HTTP 3000 con redirección 308 y HSTS de 300 segundos exclusivamente cuando HTTPS local está habilitado.
