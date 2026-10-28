# Matriz de cumplimiento — Semana 12

| Criterio | Evidencia en el proyecto |
| --- | --- |
| CRUD completo de categorías | `backend/src/routes/categorias.routes.js`, `controllers/categorias.controller.js`, `services/categorias.service.js`, `models/categorias.model.js` |
| CRUD completo de productos | `backend/src/routes/productos.routes.js`, `controllers/productos.controller.js`, `services/productos.service.js`, `models/productos.model.js` |
| Persistencia PostgreSQL | `backend/src/config/database.js`, `backend/database/schema.sql`, `backend/database/seed.sql` |
| Relación categoría-producto | FK `productos.id_categoria` → `categorias.id_categoria` en `schema.sql` |
| API documentada | `backend/src/config/swagger.js` y anotaciones Swagger en archivos de rutas |
| Catálogo público | `frontend/src/app/catalog.html`, `app.ts`, `catalog.scss` |
| Consumo de API REST | `frontend/src/app/catalog.service.ts` mediante `HttpClient` |
| Filtro por categoría | selector de categoría en `catalog.html` + consulta `GET /api/productos?categoriaId=...` |
| Frontend/backend separados | carpetas independientes `frontend/` y `backend/`; comunicación HTTP/JSON |

## Endpoints principales

### Categorías
- `GET /api/categorias`
- `GET /api/categorias/:id`
- `POST /api/categorias`
- `PUT /api/categorias/:id`
- `DELETE /api/categorias/:id`

### Productos
- `GET /api/productos`
- `GET /api/productos?categoriaId=1`
- `GET /api/productos/:id`
- `POST /api/productos`
- `PUT /api/productos/:id`
- `DELETE /api/productos/:id`

Swagger: `http://localhost:3000/api-docs`  
Frontend: `http://localhost:4200`
