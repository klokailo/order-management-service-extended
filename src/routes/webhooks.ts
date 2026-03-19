import { Router } from 'express';
import express from 'express';
import { handleStripeWebhook } from '../controllers/webhookController';

const router = Router();

/**
 * @swagger
 * /api/webhooks/stripe:
 *   post:
 *     summary: Stripe webhook receiver
 *     description: |
 *       **DO NOT add auth middleware to this route.**
 *
 *       Stripe signs its webhook payloads with a secret (STRIPE_WEBHOOK_SECRET env var).
 *       We verify the signature manually in the handler. Adding JWT auth here will break
 *       all Stripe events and you will have a bad time. This bit us in staging for 3 days (issue #87).
 *
 *       The raw body is needed for signature verification - express.json() will corrupt it.
 *       That's why this route uses express.raw() instead of the global JSON middleware.
 *
 *       **Events we handle:**
 *       - `payment_intent.succeeded` → marks order as confirmed, fires OrderConfirmed RabbitMQ event
 *       - `payment_intent.payment_failed` → marks order as cancelled
 *       - `charge.refunded` → marks order as refunded
 *
 *       Everything else is acknowledged (200) and ignored to avoid Stripe retrying.
 *     tags: [Webhooks]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Raw Stripe event payload
 *     parameters:
 *       - in: header
 *         name: stripe-signature
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe webhook signature for payload verification
 *     responses:
 *       200:
 *         description: Event received and acknowledged
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Signature verification failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *             example:
 *               error: "Webhook signature verification failed"
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
// raw body required for stripe signature verification - do not change this middleware
router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

export default router;
