import { Request, Response, NextFunction } from 'express';
import { IdempotencyKey } from '../models/IdempotencyKey';
import logger from '../utils/logger';

export const requireIdempotency = async (req: Request, res: Response, next: NextFunction) => {
  const key = req.headers['idempotency-key'] as string;

  if (!key) {
    return res.status(400).json({ error: 'Idempotency-Key header is required' });
  }

  try {
    const existingRecord = await IdempotencyKey.findOne({ key });

    if (existingRecord) {
      if (existingRecord.lockedAt) {
        return res.status(409).json({ error: 'Request is already processing' });
      }
      return res.status(existingRecord.responseStatus).json(existingRecord.responseBody);
    }

    // Mark as locked
    await IdempotencyKey.create({
      key,
      path: req.path,
      method: req.method,
      lockedAt: new Date()
    });

    // Intercept res.json to save the response
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      // Background save - purposely not awaited to avoid blocking the response
      IdempotencyKey.findOneAndUpdate(
        { key },
        { 
          lockedAt: null, 
          responseBody: body, 
          responseStatus: res.statusCode 
        }
      ).catch(err => logger.error('Failed to update idempotency key', err));
      
      return originalJson(body);
    };

    next();
  } catch (error) {
    next(error);
  }
};
