import { Router } from 'express';
import {
  createOrder,
  getOrderById,
  listOrders,
  updateOrderStatus,
  cancelOrder,
} from '../controllers/orderController';
import { requireAuth } from '../middlewares/requireAuth';

const router = Router();

// all order routes need auth, no exceptions
// if you're adding a public order lookup endpoint, talk to me first - there are PII concerns
router.use(requireAuth);

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderRequest'
 *           examples:
 *             basic:
 *               summary: Single item order
 *               value:
 *                 items:
 *                   - productId: "prod_xyz789"
 *                     quantity: 1
 *                     unitPrice: 49.99
 *                     productName: "USB-C Hub"
 *             withCoupon:
 *               summary: Order with coupon
 *               value:
 *                 couponCode: "SAVE20"
 *                 items:
 *                   - productId: "prod_abc123"
 *                     quantity: 2
 *                     unitPrice: 74.99
 *                     productName: "Wireless Headphones Pro"
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/', createOrder);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: List orders for the authenticated user
 *     description: |
 *       Returns paginated orders. Admins see all orders, regular users only see their own.
 *
 *       **Heads up:** the `total` count in the response is an estimate for collections > 10k docs
 *       because we use estimatedDocumentCount() for perf reasons. Exact counts kill the DB at scale.
 *       This tripped up the mobile team in sprint 23 so documenting it here.
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Hard capped at 100. Ask platform team if you need bulk exports.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, shipped, delivered, cancelled, refunded]
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         example: '2024-01-01'
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         example: '2024-12-31'
 *     responses:
 *       200:
 *         description: Paginated list of orders
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedOrders'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/', listOrders);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get a single order by ID
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the order
 *         example: 64f1a2b3c4d5e6f7a8b9c0d1
 *     responses:
 *       200:
 *         description: Order found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/:id', getOrderById);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     description: |
 *       Allowed transitions:
 *       - pending → confirmed, cancelled
 *       - confirmed → shipped, cancelled
 *       - shipped → delivered
 *       - delivered → refunded (via Stripe webhook only, not this endpoint)
 *       - cancelled → (terminal, no transitions)
 *       - refunded → (terminal, no transitions)
 *
 *       If you try an illegal transition you'll get a 409. The state machine lives in
 *       `src/services/orderService.ts:validateStatusTransition()`.
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateOrderStatusRequest'
 *     responses:
 *       200:
 *         description: Status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Invalid status transition
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *             example:
 *               error: "Cannot transition from 'cancelled' to 'shipped'"
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.patch('/:id/status', updateOrderStatus);

/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     summary: Cancel (soft-delete) an order
 *     description: |
 *       This does NOT hard delete the document. Sets status to 'cancelled' and
 *       stamps cancelledAt. We keep cancelled orders forever for audit/compliance.
 *       See the data retention policy doc if you need to actually purge records.
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Order cancelled
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Order is already in a terminal state
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.delete('/:id', cancelOrder);

export default router;
