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
  
  server.close(async (err) => {
    if (err) {
      logger.error(`Error closing Express server: ${err}`);
      process.exit(1);
    }
    logger.info('HTTP server closed.');
    
    try {
      await closeRabbitMQ();
      await disconnect();
      logger.info('Connections successfully closed. Exiting process.');
      process.exit(0);
    } catch (e) {
      logger.error(`Error during teardown: ${e}`);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
