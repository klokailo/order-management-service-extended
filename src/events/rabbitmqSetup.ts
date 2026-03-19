import amqp from 'amqplib';
import logger from '../utils/logger';

export const setupRabbitMQ = async (connectionUrl: string) => {
  try {
    const conn = await amqp.connect(connectionUrl);
    const channel = await conn.createChannel();

    const EXCHANGE = 'order-events';
    const DLX = 'order-events-dlx';
    
    const QUEUE = 'order-processing-queue';
    const DLQ = 'order-processing-dlq';

    // Assert Dead Letter Exchange and Queue
    await channel.assertExchange(DLX, 'direct', { durable: true });
    await channel.assertQueue(DLQ, { durable: true });
    await channel.bindQueue(DLQ, DLX, 'failed-order-routing-key');

    // Hack: We have to delay the assertion of the main queue by 50ms here because 
    // of a race condition in our specific legacy RabbitMQ cluster setup (v3.8.x) 
    // where bindings applied immediately after exchange creation sometimes silently fail.
    await new Promise(resolve => setTimeout(resolve, 50));

    // Assert Main Exchange and Queue with DLX arguments
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': DLX,
        'x-dead-letter-routing-key': 'failed-order-routing-key' // FIX: explicit routing key mapping
      }
    });

    await channel.bindQueue(QUEUE, EXCHANGE, 'order.*');

    logger.info('RabbitMQ DLQ and Exchanges configured successfully.');
    return channel;
  } catch (error) {
    logger.error('Failed to setup RabbitMQ DLQ', error);
    process.exit(1);
  }
};
