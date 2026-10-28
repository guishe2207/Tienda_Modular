# Entrega: Semana 12

## Objetivo de esta entrega

De acuerdo con el cronograma del proyecto, la Semana 12 debe incluir **backend con CRUD completo de categorías y productos** y **frontend con catálogo consumiendo la API**. Esta carpeta parte del trabajo de la Semana 11 y añade/completa exactamente ese alcance.

La solución conserva la arquitectura definida en la planeación: backend y frontend separados, comunicación exclusiva mediante API REST/JSON, PostgreSQL para persistencia y Swagger/OpenAPI para documentar y probar los endpoints.

## Alcance implementado

- CRUD completo de categorías: crear, listar, consultar por ID, actualizar y eliminar.
- CRUD completo de productos: crear, listar, consultar por ID, actualizar y eliminar.
- Validación de relación producto-categoría.
- Protección de integridad: una categoría con productos asociados no puede eliminarse y devuelve `409 Conflict`.
- Catálogo público Angular que obtiene categorías y productos por HTTP desde la API.
- Filtro por categoría sin recargar la página completa.
- Swagger/OpenAPI para consultar y probar la API.
- CORS configurado para el frontend de desarrollo.
- SQL reproducible mediante `schema.sql` y `seed.sql`.

**Fuera de alcance en Semana 12:** carrito de compras, panel de administrador, HTTPS, mitigación XSS/CSRF y despliegue final. Esos puntos corresponden a semanas posteriores.

## Estructura y responsabilidades

- `backend/src/config`: variables de entorno, pool PostgreSQL y OpenAPI.
- `backend/src/routes`: declara las rutas HTTP y sus anotaciones Swagger.
- `backend/src/controllers`: adapta la petición y la respuesta HTTP.
- `backend/src/services`: aplica reglas de negocio, por ejemplo, comprobar una categoría antes de guardar un producto.
- `backend/src/models`: consultas SQL parametrizadas y acceso a PostgreSQL.
- `backend/src/middleware`: validación de datos, CORS y tratamiento común de errores.
- `backend/database`: creación de tablas e inserción reproducible de datos de ejemplo.
- `frontend/src/app`: catálogo, tipos y servicio `HttpClient`.
- `frontend/src/environments`: dirección configurable de la API.

## Preparación local

### Herramientas

Se comprobó el desarrollo con Node.js 24.18.0, npm 11.16.0, Angular CLI 22.0.9, PostgreSQL 18, Git 2.55.0 y Docker 29.7.2 en Windows 11. Para reproducirlo, usa Node.js 24 LTS, PostgreSQL 16 o superior, Git 2 o superior y PowerShell. Angular CLI 22 y Express 5 se instalan como dependencias del proyecto; no hace falta instalarlos globalmente.

Verifica las versiones en la terminal de VS Code:

```powershell
node --version
npm --version
npx ng version
psql --version
git --version
```

Instala Node.js desde `https://nodejs.org/`, PostgreSQL desde `https://www.postgresql.org/download/windows/` y Git desde `https://git-scm.com/download/win`. Node.js incluye npm. Si `psql` no se reconoce, ejecuta el cliente con su ruta, normalmente `C:\Program Files\PostgreSQL\18\bin\psql.exe`, o agrega esa carpeta al `PATH` de Windows.

### Dependencias y configuración

Desde la raíz del proyecto:

```powershell
npm install --prefix backend
npm install --prefix frontend
Copy-Item backend/.env.example backend/.env
```

Abre `backend/.env` en el editor y configura `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` y `PGPASSWORD` con los valores de tu instalación local. No subas ese archivo a Git. El `.env.example` contiene únicamente valores demostrativos.

### Crear esquema y datos

Crea la base `tienda_modular` usando pgAdmin o el cliente `psql`. Con la ruta habitual en Windows:

```powershell
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
& $psql -U postgres -h localhost -d postgres
```

En la consola escribe:

```sql
CREATE DATABASE tienda_modular;
\q
```

Luego, desde la raíz del repositorio, crea las tablas y carga el catálogo de ejemplo:

```powershell
& $psql -U postgres -h localhost -d tienda_modular -f backend/database/schema.sql
& $psql -U postgres -h localhost -d tienda_modular -f backend/database/seed.sql
```

Usa el usuario administrador que definiste durante la instalación; si el directorio de PostgreSQL tiene otro número de versión, cambia la ruta al ejecutable. `schema.sql` es repetible y establece PK, FK, restricciones de precio/stock e índice para el filtro. `seed.sql` evita repetir los registros de ejemplo si se ejecuta varias veces.

### Iniciar los proyectos

Abre dos terminales PowerShell en VS Code. En la primera inicia el API:

```powershell
npm --prefix backend run dev
```

En la segunda inicia Angular:

```powershell
npm --prefix frontend start
```

El catálogo abre en `http://localhost:4200`, Swagger en `http://localhost:3000/api-docs` y el documento OpenAPI JSON en `http://localhost:3000/api-docs/openapi.json`. La ruta `http://localhost:3000/api/health` confirma conjuntamente API y base de datos. `npm start` de Angular y `npm run dev` del backend se pueden usar también desde la subcarpeta respectiva.

## Modelo y contrato de datos

`categorias.id_categoria` es la clave primaria. `productos.id_categoria` es una clave foránea obligatoria a `categorias.id_categoria`: una categoría puede asociarse a muchos productos, y cada producto tiene exactamente una categoría. `ON DELETE RESTRICT` protege las referencias. El servicio comprueba el conflicto antes de intentar borrar y responde `409 Conflict`; la clave foránea mantiene esa garantía ante una operación concurrente.

La base de datos usa `snake_case`. Las consultas devuelven los nombres de contrato acordados, como `idCategoria`, `idProducto` y `precio`. El driver `pg` entrega `NUMERIC` como texto, por lo que el modelo normaliza `precio` a número antes de responder JSON.

Todas las consultas que reciben datos usan parámetros `$1`, `$2`, etc. Nunca se concatena una entrada del usuario en SQL. La validación del backend exige nombres no vacíos, precio numérico positivo, stock entero no negativo y categoría con ID entero positivo. Los cuerpos rechazan propiedades desconocidas. Una categoría inexistente al crear o editar un producto produce `422 Unprocessable Entity`.

Los errores siguen el mismo formato:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "La solicitud contiene datos invalidos.",
    "details": [{ "field": "precio", "message": "Debe ser un numero mayor que cero." }]
  }
}
```

Las respuestas satisfactorias de lectura y escritura usan `{ "data": ... }`; las eliminaciones satisfactorias responden `204 No Content`. Códigos principales: `200` para consultas y actualizaciones, `201` al crear, `204` al eliminar, `400` para entradas incorrectas, `404` para recursos inexistentes, `409` si la categoría aún tiene productos y `422` si la categoría referenciada no existe.

## Rutas de la API

Todas las rutas base están bajo `/api`. Cada endpoint está anotado en el archivo de rutas y se puede ejecutar desde Swagger.

| Método | Ruta | Comportamiento |
| --- | --- | --- |
| `GET` | `/api/categorias` | Lista categorías |
| `GET` | `/api/categorias/:id` | Obtiene una categoría |
| `POST` | `/api/categorias` | Crea una categoría; espera `nombre` y `descripcion` opcional |
| `PUT` | `/api/categorias/:id` | Reemplaza la categoría |
| `DELETE` | `/api/categorias/:id` | Elimina si está vacía; `409` si tiene productos |
| `GET` | `/api/productos` | Lista todos los productos |
| `GET` | `/api/productos?categoriaId=1` | Filtra por categoría sin recarga del frontend |
| `GET` | `/api/productos/:id` | Obtiene un producto |
| `POST` | `/api/productos` | Crea producto con `nombre`, `precio`, `stock` e `idCategoria` |
| `PUT` | `/api/productos/:id` | Reemplaza el producto y comprueba su categoría |
| `DELETE` | `/api/productos/:id` | Elimina un producto |
| `GET` | `/api/health` | Comprueba API y conexión de PostgreSQL |

Para probar, abre `http://localhost:3000/api-docs`, elige un endpoint, pulsa **Try it out** y envía el ejemplo. El filtro acepta un entero positivo en `categoriaId`; el API responde una lista vacía si no hay productos en esa categoría.

## Angular, HTTP y CORS

`CatalogService` usa `HttpClient` para consultar categorías y productos. `provideHttpClient()` registra el cliente Angular. Al cambiar el selector, `switchMap` envía otra petición al endpoint de productos con `categoriaId`, actualiza las señales de la vista y cancela la suscripción a la consulta anterior; no se recarga el documento. El catálogo distingue carga, error, lista vacía y productos disponibles.

`environment.development.ts` configura `http://localhost:3000/api` en el servidor de desarrollo; `environment.ts` define el valor de compilación de producción, que se puede ajustar para el entorno de ejecución deseado. No hay conexión directa del frontend a PostgreSQL.

Express restringe CORS a `http://localhost:4200` de forma predeterminada. Se cambia el origen permitido con `CORS_ORIGIN` en `.env`. CORS es una política del navegador que autoriza a ese origen a leer respuestas; no autentica usuarios ni reemplaza validaciones del API.

## Pruebas y comandos

Desde la raíz ejecuta:

```powershell
npm --prefix backend test
npm --prefix backend run check
npm --prefix frontend test -- --watch=false
npm --prefix frontend run build
```

Las pruebas del backend usan Supertest y cubren Swagger, formato de errores, validación de entradas y CORS; no necesitan conexión a PostgreSQL. La prueba Angular usa `HttpTestingController` para comprobar la consulta filtrada y que la vista se actualiza con la respuesta HTTP simulada. La comprobación de `health` y los CRUD persistentes sí requieren crear la base, ejecutar los scripts y configurar el `.env`.

En Windows, Angular usa `cross-env` para seleccionar Sass puro de JavaScript (`NG_BUILD_SASS_EMBEDDED=0`), porque el proceso Sass embebido falló al arrancar en este entorno. El proyecto conserva Angular, TypeScript y SCSS.

## Decisiones para la sustentación

- **Capas:** la ruta recibe HTTP, el controlador forma la respuesta, el servicio valida reglas del negocio, y el modelo contiene SQL. Así, la regla de categoría existente no queda escondida dentro de una ruta.
- **Relación 1:N:** un producto apunta a una categoría por medio de la clave foránea. PostgreSQL impide dejar productos huérfanos y restringe el borrado de categorías en uso.
- **Consultas parametrizadas:** los valores viajan como parámetros separados del texto SQL. Esto protege la consulta de entradas que intenten alterar su estructura.
- **Validaciones y errores:** se verifican forma y tipo antes de llamar a la base; el middleware transforma fallos conocidos en JSON consistente y códigos HTTP útiles.
- **Swagger:** las anotaciones de cada ruta describen parámetros, cuerpos, ejemplos y respuestas. `swagger-jsdoc` genera OpenAPI y `swagger-ui-express` permite probarlo desde el navegador.
- **HttpClient y filtro:** Angular pide JSON al API; cambiar la categoría dispara una nueva petición HTTP y actualiza el mismo componente sin recargar la página.
- **CORS:** limita qué origen del navegador puede leer la API durante el desarrollo; no se usa como un mecanismo de autenticación.
- **PostgreSQL:** se eligió `pg` directamente para mostrar SQL explícito, y `schema.sql`/`seed.sql` hacen reproducible la preparación de datos.

## Trabajo de tres integrantes y Git

1. **Responsable backend:** trabaja en `backend/src/` y `backend/database/`. Rama sugerida: `feat/api-catalogo`. Integra rutas, servicios, SQL, validaciones y pruebas API.
2. **Responsable frontend:** trabaja en `frontend/src/`. Rama sugerida: `feat/catalogo-angular`. Integra modelos, servicio HTTP, entornos, vista y pruebas del filtro.
3. **Responsable de documentación e integración:** trabaja en `README.md`, `docs/` y `.gitignore`; revisa cambios de ambas ramas, prueba el arranque integrado y resuelve conflictos con quienes son dueños del código fuente.

Acuerden primero los nombres JSON, rutas, códigos HTTP y la URL local de API. Creen cada rama desde la rama acordada (`main` o `develop`) y eviten que dos personas editen los mismos archivos. Hagan commits pequeños al cerrar unidades verificables: esquema/semilla; cada CRUD; contrato y errores; catálogo; pruebas; documentación e integración. Abran una solicitud de integración hacia la rama común, revisen los cambios juntos y ejecuten las pruebas antes de combinar. No se debe incluir `.env`, `node_modules`, `dist` ni credenciales en ningún commit. El proyecto no está enlazado a un repositorio remoto y no se hizo `git push`.

## Fuera de alcance

Carrito, administración, autenticación, HTTPS, mitigaciones XSS/CSRF, pagos, facturación, envíos, aplicación móvil, recomendaciones y despliegue quedan para semanas posteriores. No son parte del alcance implementado en esta entrega.

## Checklist de aceptación

### Checklist Semana 12

- [ ] CRUD de categorías y productos reflejado en PostgreSQL y en las respuestas de la API.
- [ ] No se acepta un producto con categoría inexistente.
- [ ] No se elimina una categoría que tenga productos; responde `409` y conserva la categoría.
- [ ] El catálogo muestra todos los productos y solo los de la categoría seleccionada.
- [ ] El filtro funciona sin recargar la página completa.
- [ ] La API es comprensible y se puede probar desde Swagger.
- [ ] Backend y frontend son proyectos independientes y se comunican mediante JSON por HTTP.
- [ ] Errores de validación tienen formato uniforme y códigos HTTP apropiados.
- [ ] El origen de desarrollo Angular está permitido por CORS y la URL del API es configurable.
- [ ] Los datos de prueba se pueden cargar de forma reproducible.
