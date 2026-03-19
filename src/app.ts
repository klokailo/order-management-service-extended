import metricsRouter from "./routes/metrics";
import { metricsMiddleware } from "./middlewares/metricsMiddleware";
import express from 'express';
const app = express();
app.get('/health', (req, res) => res.send('OK'));
export default app;
