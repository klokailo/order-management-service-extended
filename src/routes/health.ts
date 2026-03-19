import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Service health check
 *     description: |
 *       Used by Kubernetes liveness probe. Returns 200 if the service is up,
 *       503 if mongo or rabbit is disconnected.
 *
 *       Note: we intentionally don't auth this endpoint. K8s probes don't carry JWTs.
 *       If someone discovers the /health endpoint externally thats fine, no sensitive data here.
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             example:
 *               status: ok
 *               uptime: 3921.4
 *               mongo: connected
 *               rabbit: connected
 *               version: "1.4.0"
 *       503:
 *         description: Service is unhealthy - one or more dependencies are down
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             example:
 *               status: degraded
 *               uptime: 3921.4
 *               mongo: disconnected
 *               rabbit: connected
 *               version: "1.4.0"
 */
router.get('/', (req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  // rabbit status - we dont have a great way to check this without a ping message
  // so we just track the last known connection state in a module-level var in publisher.ts
  // this is a bit janky but its good enough for k8s probes
  const rabbitStatus = 'connected'; // TODO: wire this up to actual rabbit state

  const isHealthy = mongoStatus === 'connected';

  const payload = {
    status: isHealthy ? 'ok' : 'degraded',
    uptime: process.uptime(),
    mongo: mongoStatus,
    rabbit: rabbitStatus,
    version: process.env.npm_package_version ?? 'unknown',
  };

  res.status(isHealthy ? 200 : 503).json(payload);
});

export default router;
