import Order, { IOrder } from '../models/Order';
import { eventPublisher } from '../events/publisher';
import { logger } from '../utils/logger';

export class OrderService {
  static async createOrder(data: Partial<IOrder>): Promise<IOrder> {
    const totalAmount = data.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
    
    const order = new Order({
      ...data,
      totalAmount,
      status: 'PENDING'
    });
    
    const savedOrder = await order.save();
    
    // Fire and forget event
    eventPublisher.publish('order.created', {
      orderId: savedOrder._id,
      customerId: savedOrder.customerId,
      items: savedOrder.items,
      totalAmount: savedOrder.totalAmount
    }).catch(err => logger.error('Failed to publish order.created event', { err }));

    return savedOrder;
  }

  static async getOrderById(id: string): Promise<IOrder | null> {
    return await Order.findById(id);
  }
}
