const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const { corsOrigins, https: httpsConfig, production } = require('./config/env');
const swaggerDocument = require('./config/swagger');
const { AppError, errorHandler, notFound } = require('./middleware/errors');
const authRoutes = require('./routes/auth.routes');
const categoriasRoutes = require('./routes/categorias.routes');
const healthRoutes = require('./routes/health.routes');
const productosRoutes = require('./routes/productos.routes');
const pedidosRoutes = require('./routes/pedidos.routes');
const pedidosController = require('./controllers/pedidos.controller');
const { requireAuth, requireRole } = require('./middleware/auth');
const { validateId } = require('./middleware/validation');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', false);
app.locals.cookiesSecure = production || httpsConfig.enabled;
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Swagger UI incorpora su inicialización en línea.
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  strictTransportSecurity: httpsConfig.enabled ? { maxAge: 300 } : false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new AppError(403, 'ORIGIN_NOT_ALLOWED', 'El origen no esta permitido por CORS.'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use((request, response, next) => {
  request.cookies = Object.fromEntries((request.headers.cookie || '').split(';').map((part) => {
    const index = part.indexOf('=');
    return index < 0 ? [] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter((pair) => pair.length));
  next();
});
app.get('/api-docs/openapi.json', (request, response) => response.json(swaggerDocument));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'Catalogo | API',
}));
app.use('/api/auth', authRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.get('/api/admin/pedidos', requireAuth, requireRole('admin'), pedidosController.listar);
app.get('/api/admin/pedidos/:id', requireAuth, requireRole('admin'), validateId, pedidosController.obtener);
app.use('/api/health', healthRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
