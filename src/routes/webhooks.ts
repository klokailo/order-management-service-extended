import { Router } from 'express';
import express from 'express';
import Stripe from 'stripe';
import Order from '../models/Order';
import { logger } from '../utils/logger';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2022-11-15' as any });

// Webhooks require the raw body for signature verification
router.post('/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err: any) {
    logger.error('Stripe webhook signature verification failed', { error: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      logger.info('Payment succeeded!', { paymentId: paymentIntent.id });
      // Update order status in DB based on metadata
      if (paymentIntent.metadata.orderId) {
        await Order.findByIdAndUpdate(paymentIntent.metadata.orderId, { status: 'PAID' });
      }
      break;
    case 'payment_intent.payment_failed':
      logger.warn('Payment failed', { eventData: event.data.object });
      break;
    default:
      logger.info(`Unhandled event type ${event.type}`);
  }

  res.send();
});

export default router;
