const express = require('express');
const controller = require('../controllers/pedidos.controller');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');
const { requireCsrfIfAuthenticated } = require('../middleware/csrf');
const { validateId, validateOrder } = require('../middleware/validation');
const router = express.Router();
/** @swagger
 * /api/pedidos:
 *   post:
 *     tags: [Pedidos]
 *     summary: Crea un pedido simulado y descuenta inventario atómicamente
 *     responses:
 *       201: { description: Pedido confirmado }
 *       409: { description: Inventario insuficiente }
 */
router.post('/', optionalAuth, requireCsrfIfAuthenticated, validateOrder, controller.crear);
router.get('/', requireAuth, requireRole('admin'), controller.listar);
router.get('/:id', requireAuth, validateId, controller.obtener);
module.exports = router;
