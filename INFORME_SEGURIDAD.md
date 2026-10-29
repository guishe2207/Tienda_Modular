# Informe de seguridad — Tienda Modular

Fecha: 29 de octubre de 2026. Rama de trabajo: `seguridad`.

## Alcance y metodología

Se revisó estáticamente Express, Angular, SQL, configuración y dependencias; se ejecutaron las pruebas y compilaciones registradas en [evidencias](docs/seguridad/evidencias/). El 29 de octubre se levantó exclusivamente el contenedor local `tienda-modular-postgres` en `127.0.0.1:5433`, se instaló la CA local con mkcert y se probaron API HTTPS y Angular con Chrome en modo headless. No se modificó Render, producción ni `main`; la URL pública de contexto es `https://tienda-modular-frontend.onrender.com/` y no fue destino de pruebas de escritura.

## Diagnóstico inicial

| # | Hallazgo | OWASP | Evidencia (cómo lo comprobé) | Corrección aplicada | Estado |
|---|---|---|---|---|---|
| 1 | Contraseñas sin hash | A07 | `password.js` ya usaba `scrypt` con sal aleatoria y comparación segura. | Se conserva: scrypt es KDF lento equivalente justificado. | No |
| 2 | Secretos escritos en código | A02/A04 | Revisión de `.env.example`, configuración y `git ls-files`. Había valores inseguros sólo de desarrollo como respaldo. | Producción exige `CSRF_SECRET` y ahora `JWT_SECRET`; ejemplo sin secretos reales. | Corregido |
| 3 | `.env` rastreado | A02 | `git ls-files .env '*.pem' '*.key'` no devolvió archivos. | `.gitignore` conserva exclusiones de `.env` y certificados. | No |
| 4 | Renderizado HTML inseguro | A05 | Búsqueda de `innerHTML`, `outerHTML`, `document.write`, `insertAdjacentHTML` y `bypassSecurityTrustHtml` sin resultados. | Se conserva interpolación/escape automático Angular. | No |
| 5 | IDOR en pedidos | A01 | Dos clientes de laboratorio: pedido de A consultado por B respondió 404. | Usuario autenticado queda asociado al pedido y se compara propiedad. | Corregido |
| 6 | Endpoints administrativos sin rol | A01 | `requireAuth` validaba sesión, pero no distinguía roles. | `requireRole('admin')` en CRUD, categorías y pedidos administrativos. | Corregido |
| 7 | CORS abierto | A02 | `cors` usa lista de orígenes, no `*`. | Se añadió `credentials: true` sin comodín. | No/corroborado |
| 8 | HTTP sin HTTPS local | A02/A04 | Certificado mkcert autorizado por Node; HTTP 3000 respondió 308. | HTTPS 3443, redirección 3000→3443 y HSTS local de 300 s. | Corregido |
| 9 | Errores inseguros | A10 | Middleware central oculta errores 500 y SQL. | Se conserva y cubre por prueba. | No/corroborado |
| 10 | Dependencias vulnerables | A03 | `npm audit --omit=dev` backend y frontend: 0 vulnerabilidades. | No se aplicaron actualizaciones forzadas. | No/corroborado |

Las pruebas HTTP detalladas y sin secretos están en `06-pruebas-http-local.json`.

## Parte 1 — HTTPS

La configuración local usa `HTTPS_ENABLED=true`, rutas de certificado ignoradas por Git y `HTTPS_PORT=3443`; `server.js` escucha TLS en 3443 y redirige HTTP 3000 con 308. HSTS de 300 s sólo se habilita en este modo local, no se configura para Render. Se ejecutó `mkcert -install`, se generó certificado para `localhost`, `127.0.0.1` y `::1`, y Node verificó la cadena con `CERT_AUTHORIZED=true` y respuesta HTTPS 200.

HTTPS ofrece (1) confidencialidad/integridad del tráfico frente a observadores o modificaciones y (2) autenticación del servidor mediante certificado validado. No garantiza que el sitio sea honesto: un sitio malicioso puede tener HTTPS válido.

## Parte 2 — autenticación

Se migró el panel desde Bearer en `sessionStorage` a JWT HS256 firmado, expiración de 15 minutos y cookie `tm_session` HttpOnly, Secure cuando se usa HTTPS/producción y SameSite=Strict. La cookie CSRF no es HttpOnly para que Angular envíe `X-CSRF-Token`; no contiene la sesión. Logout elimina la sesión persistida y ambas cookies. El login limita a cinco fallos por IP y usuario en quince minutos, responde 429 y no confía en `X-Forwarded-For` (`trust proxy=false`).

El registro público acepta únicamente `usuario` y `password`, aplica mínimo 12 caracteres y crea siempre `rol='cliente'`; cualquier campo `rol` se rechaza. Administradores no se crean públicamente. Las contraseñas mantienen scrypt con sal aleatoria de 16 bytes, derivación de 64 bytes y `timingSafeEqual`.

La prueba integrada local confirmó login 200, atributos HttpOnly/Secure/SameSite=Strict, JWT vencido 401 y sexto intento 429. El token de sesión no se imprimió ni se almacenó en evidencia; por diseño HttpOnly no es accesible mediante `document.cookie`.

## Parte 3 — roles e IDOR

Visitante: catálogo público; escrituras responden 401. Cliente: no puede CRUD administrativo (403) y la consulta individual compara `id_usuario`, respondiendo 404 ante pedido ajeno. Administrador: CRUD, inventario y consultas de pedidos. El checkout de invitados se conservó para no romper el flujo existente; por ello los pedidos históricos sin cuenta no son consultables por clientes. La migración `002_usuarios_roles.sql` conserva admins existentes y añade propiedad opcional.

## Parte 4 — XSS, Helmet y CSP

No se encontraron APIs de inserción HTML insegura. Angular conserva escape automático y las validaciones de servidor restringen tipos y longitudes. Helmet entrega CSP, `X-Content-Type-Options: nosniff`, `frame-ancestors 'none'`, `object-src 'none'` e imágenes propias/data/HTTPS. Swagger requiere `unsafe-inline` limitado a scripts/estilos de la interfaz; no se habilita `unsafe-eval`. Chrome renderizó una carga `<img ... onerror>` y `<script>` como texto codificado; la captura real está en `07-catalogo-xss-escape.png`.

## Parte 5 — CSRF

Se reemplazó el HMAC derivado de Bearer por doble envío: token aleatorio de 32 bytes en cookie `tm_csrf` y en `X-CSRF-Token`, comparado con tiempo constante. Angular se configuró para esos nombres; POST/PUT/DELETE autenticados lo exigen. La integración local confirmó 403 sin token y 201 con token válido; el producto/categoría falso no se creó en la petición rechazada.

SameSite=Strict reduce envíos de cookies desde otros sitios, pero CSRF sigue siendo defensa en profundidad: configuraciones futuras menos estrictas, navegadores, subdominios y cambios de flujo pueden reabrir vectores; el token verifica intención y origen del cliente.

## Parte 6 — secretos, CORS, errores y dependencias

No se hallaron `.env`, claves PEM o KEY rastreados. Si alguna credencial histórica aparece, debe rotarse antes de publicar, sin incluir su valor en este informe. PostgreSQL debe operar con usuario de mínimos privilegios, TLS (`PGSSL=true` y CA cuando aplique), secreto fuera de Git y restricciones de red de Render. CORS sólo permite orígenes configurados y el propio API, con credenciales sin `*`. El middleware externo devuelve errores genéricos 500 y registra el detalle técnico sólo en servidor.

## Parte 7 — OWASP, riesgos e incidentes

| Categoría | Resultado |
|---|---|
| A01 Control de acceso roto | Roles y propiedad de pedido corregidos y probados: 401, 403 y 404. |
| A02 Configuración insegura | CORS restringido, cabeceras y HTTPS mkcert probado localmente. |
| A03 Cadena de suministro | Audit sin vulnerabilidades de producción; hay actualizaciones compatibles documentadas en evidencia. |
| A04 Fallas criptográficas | scrypt con sal, JWT firmado, TLS local preparado. |
| A05 Inyección/XSS | SQL parametrizado, validación y escape Angular confirmados en navegador. |
| A06 Diseño inseguro | Cantidad negativa 400 y precio enviado por cliente ignorado; total calculado en PostgreSQL. |
| A07 Autenticación | Cookie HttpOnly, JWT 15 min, logout y rate limit implementados. |
| A08 Integridad software/datos | Lockfiles presentes, migración versionada, idempotencia de pedido. |
| A09 Registros y alertas | Error técnico se registra sin enviarlo al cliente; falta centralización. |
| A10 Condiciones excepcionales | Manejador central y validación JSON; pruebas automatizadas pasan. |

### Matriz de riesgos

| Riesgo residual | Probabilidad | Impacto | Tratamiento | Justificación |
|---|---|---|---|---|
| Credencial PostgreSQL filtrada | Media | Alto | Mitigar | Rotación, secretos Render, mínimo privilegio y red restringida. |
| Fuerza bruta distribuida | Media | Medio | Mitigar | Límite local existe; falta rate limiting distribuido/observabilidad. |
| XSS en cambio futuro | Baja | Alto | Mitigar | CSP y Angular reducen riesgo; añadir pruebas e impedir bypass. |
| Pedido invitado sin historial autenticado | Media | Medio | Aceptar temporalmente | Se preservó checkout; planificar asociación explícita al cliente. |
| Vulnerabilidad transitoria de dependencia | Media | Alto | Mitigar | Audit en CI, Dependabot y actualización compatible periódica. |

### Respuesta a incidente: fuga de cadena PostgreSQL (NIST)

1. **Preparación:** inventario de secretos, variables Render, runbook y backups cifrados.
2. **Detección:** alertas de accesos anómalos, logs de Render/PostgreSQL y escaneo de repositorio.
3. **Contención:** revocar la credencial, restringir red y detener accesos no esenciales.
4. **Erradicación:** rotar usuario/contraseña/cadena, eliminar la filtración y revisar historial/CI.
5. **Recuperación:** desplegar variable nueva, verificar TLS/conexión con usuario mínimo y vigilar actividad.
6. **Lecciones aprendidas:** línea temporal, causa raíz, pruebas de detección y actualización de controles.

### Datos personales — Ley 1581 de 2012

La tienda guarda nombre, correo, teléfono, dirección, ciudad/departamento, observaciones y pedido. Su finalidad aparente es procesar y entregar compras; el mínimo es contacto/dirección y detalle de pedido. Observaciones y teléfono deben revisarse por necesidad, limitarse y protegerse. Se recomiendan aviso de privacidad, base/consentimiento aplicable, retención definida, control de acceso, cifrado en tránsito, atención de derechos del titular y no registrar datos sensibles. Esto no constituye declaración de cumplimiento legal completo.

### Respuestas finales

1. El hallazgo más grave fue la sesión administrativa en `sessionStorage` con Bearer: un XSS podría leerla. Se corrigió con cookie HttpOnly y JWT de vida corta.
2. Gestión de secretos, mínimo privilegio y parcheo continuo habrían reducido incidentes como Equifax; MFA y alertas habrían limitado abuso de credenciales como en Uber.
3. Prioridades: MFA para admins, renovación/rotación controlada de tokens, registros centralizados con alertas y pruebas de seguridad automatizadas en CI.

## Resultados ejecutados y pendientes

Las evidencias reales están en `docs/seguridad/evidencias/`. Se aprobaron 17/17 pruebas backend, 7/7 frontend, compiló Angular y la batería de integración HTTPS local aprobó 19/19 verificaciones. Se aplicó esquema, semilla y migración sobre PostgreSQL local aislado; se verificaron catálogo, creación administrativa, checkout autenticado, control de precio/stock, CSRF, roles, IDOR, CORS, Helmet, HTTPS y XSS. La única limitación de interfaz es que no se automatizó el login visual del panel ni el carrito con clicks; sus servicios, rutas y operación de compra sí fueron validados por build, tests y API real.

## PDF y entrega

El PDF final se generó con ReportLab en `docs/seguridad/Informe_Laboratorio_Seguridad_Tienda_Modular.pdf`. No se inventaron integrantes: el repositorio no los identifica en el material revisado. Referencias: guía local `docs/Guia_Laboratorio_Seguridad_Express.pdf`, OWASP Top 10 y Ley 1581 de 2012.

## Conclusión

El laboratorio redujo el riesgo más relevante —robo de sesión administrativa mediante token accesible a JavaScript— y verificó las defensas en un entorno local aislado. Antes de producción se recomienda aplicar la migración bajo respaldo, configurar secretos reales en Render, habilitar TLS de PostgreSQL cuando el proveedor lo soporte y añadir estas pruebas a CI.
