import { Order } from '../models/Order';
import { logger } from '../utils/logger';

export class OrderService {
  static async updateOrderStatus(orderId: string, newStatus: string) {
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }

    order.status = newStatus;

    try {
      await order.save();
      logger.info(`Order ${orderId} status updated to ${newStatus}`);
      return order;
    } catch (error: any) {
      // If a concurrent update bumped the version, Mongoose throws a VersionError
      if (error.name === 'VersionError') {
        logger.warn(`Concurrency conflict detected for Order ${orderId}`);
        throw new Error('Order was modified by another transaction. Please try again.');
      }
      throw error;
    }
  }
}
