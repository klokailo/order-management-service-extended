import { correlationIdMiddleware } from "./middlewares/correlationId";
import { logger } from "./utils/logger";
import webhookRoutes from "./routes/webhooks";


import express from 'express';
import dotenv from 'dotenv';

dotenv.config();
import { connectDB } from "./db/connection";

connectDB();

const app = express();
// Stripe webhooks must be parsed before express.json()
app.use("/api/webhooks", webhookRoutes);

app.use(express.json());
app.use(correlationIdMiddleware);
app.use((req, res, next) => {
  logger.info(`Incoming ${req.method} request to ${req.path}`, { correlationId: req.headers["x-correlation-id"] });
  next();
});


app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'order-management' });
});

export default app;
