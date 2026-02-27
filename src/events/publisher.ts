import amqp, { Connection, Channel } from 'amqplib';
import { logger } from '../utils/logger';

class EventPublisher {
  private connection!: Connection;
  private channel!: Channel;
  private connected: boolean = false;

  async connect() {
    try {
      const amqpUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
      this.connection = await amqp.connect(amqpUrl);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange('order_events', 'topic', { durable: true });
      this.connected = true;
      logger.info('Successfully connected to RabbitMQ');
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ', { error });
    }
  }

  async publish(routingKey: string, data: any) {
    if (!this.connected) {
      logger.warn('RabbitMQ channel not established. Event dropped.', { routingKey });
      return;
    }
    this.channel.publish(
      'order_events',
      routingKey,
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );
    logger.info(`Published event to ${routingKey}`, { eventId: data.id });
  }
}

export const eventPublisher = new EventPublisher();
