import { Request, Response, NextFunction } from 'express';
import { IdempotencyKey } from '../models/IdempotencyKey';

export const requireIdempotency = async (req: Request, res: Response, next: NextFunction) => {
  const key = req.headers['idempotency-key'] as string;

  if (!key) {
    return res.status(400).json({ error: 'Idempotency-Key header is required' });
  }

  try {
    // FIX: Using atomic findOneAndUpdate with upsert prevents race conditions between find and create.
    // Hack: Stripe's webhooks will sometimes fire the exact same event twice within 5-10ms of each other 
    // due to their internal distributed dispatchers. A standard `findOne` then `save` will fail because 
    // both threads read null at the same time. The $setOnInsert guarantees only one thread gets to create the lock.
    const record = await IdempotencyKey.findOneAndUpdate(
      { key },
      { $setOnInsert: { path: req.path, method: req.method, lockedAt: new Date() } },
      { upsert: true, new: false } // new: false returns the document BEFORE the update (null if it was just inserted)
    );

    if (record) {
      // If record existed, it means another request already initiated this
      if (record.lockedAt) {
        return res.status(409).json({ error: 'Concurrent request detected. Please wait.' });
      }
      // Return cached response
      return res.status(record.responseStatus).json(record.responseBody);
    }

    // Intercept res.json to save the response state
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      IdempotencyKey.findOneAndUpdate(
        { key },
        { 
          lockedAt: null, 
          responseBody: body, 
          responseStatus: res.statusCode 
        }
      ).catch(err => console.error('Failed to update idempotency key', err));
      
      return originalJson(body);
    };

    next();
  } catch (error: any) {
    // Fallback: If upsert throws a duplicate key error (E11000) for extremely tight race conditions
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Concurrent request detected. Please wait.' });
    }
    next(error);
  }
};
