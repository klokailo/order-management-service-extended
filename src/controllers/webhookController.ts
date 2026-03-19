import { Request, Response, NextFunction } from 'express';

export const handleStripeWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Real implementation verifies stripe-signature header before doing anything
    // see docs/stripe-webhook-setup.md for the full setup guide
    const sig = req.headers['stripe-signature'];
    if (!sig) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }
    // TODO: wire up to stripe SDK webhook verification
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
};
