import { Router } from 'express';
import { register } from '../metrics/metrics';

const router = Router();

router.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  
const metrics = await register.metrics();
res.set("Content-Length", Buffer.byteLength(metrics));
res.end(metrics);

});

export default router;
