import { Request, Response, NextFunction } from 'express';
import { httpRequestDurationMicroseconds } from '../metrics/metrics';

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    // Edge case: Express sometimes reports route as undefined for 404s
    const route = req.route?.path || req.path || 'unknown_route';

    httpRequestDurationMicroseconds
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
  });

  next();
};
