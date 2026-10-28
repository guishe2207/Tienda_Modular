
## Tienda modular: administración y compra simulada

Incluye catálogo, carrito, panel administrativo (`/admin/login`) y checkout (`/checkout`). El pago es **simulado**: los campos de tarjeta son solo visuales, no se envían a la API ni se almacenan.

### Ejecutar en PowerShell

1. Configure `backend/.env` a partir de `.env.example` y cree la base PostgreSQL.
2. Instalación nueva: `psql -U postgres -d tienda -f backend/database/schema.sql`. Base existente: `psql -U postgres -d tienda -f backend/database/migrations/001_pedidos.sql`.
3. Cree un administrador: `npm --prefix backend run admin:crear`.
4. Inicie API: `npm --prefix backend start`; frontend: `npm --prefix frontend start`.

El checkout recalcula el total en PostgreSQL y bloquea el inventario con `FOR UPDATE`. Pedido, detalle y descuento de stock se confirman o revierten en una sola transacción; la clave idempotente evita duplicados. Swagger: `http://localhost:3000/api-docs`.
