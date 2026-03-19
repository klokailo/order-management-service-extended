import app from './app';
import { connect, disconnect } from './db/connection';
import { closeRabbitMQ } from './events/publisher';
import logger from './utils/logger';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, async () => {
  await connect();
  logger.info(`Server running on port ${PORT}`);
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Hack: We have to delay closing the server by 500ms because of a race condition
  // with the AWS ALB and Kubernetes ingress. When K8s sends SIGTERM, it simultaneously
  // updates the iptables to remove the pod from the service endpoints. This takes a few
  // hundred milliseconds. If we instantly stop accepting connections, requests that were
  // already routed to us but haven't reached the socket yet will result in a 502 Bad Gateway.
  // Delaying allows the networking layer to flush in-flight traffic to us before we close.
  setTimeout(() => {
    logger.info('500ms ALB deregistration buffer elapsed. Closing server connections...');
    server.close(async (err) => {
      if (err) {
        logger.error(`Error closing Express server: ${err}`);
        process.exit(1);
      }
      logger.info('HTTP server closed. No new connections accepted.');
      
      try {
        await closeRabbitMQ();
        await disconnect();
        logger.info('Infrastructure connections successfully closed. Exiting process 0.');
        process.exit(0);
      } catch (e) {
        logger.error(`Error during teardown: ${e}`);
        process.exit(1);
      }
    });
  }, 500);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// webhook worker - starts polling after db is connected
// imported here not in app.ts because app.ts is used in tests without a real db
import { startWebhookWorker } from "./jobs/webhookWorker";
startWebhookWorker();
