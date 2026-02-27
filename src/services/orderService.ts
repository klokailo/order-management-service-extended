import Order, { IOrder } from '../models/Order';

export class OrderService {
  static async createOrder(data: Partial<IOrder>): Promise<IOrder> {
    // Business logic: ensure total amount is calculated correctly
    const totalAmount = data.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
    
    const order = new Order({
      ...data,
      totalAmount,
      status: 'PENDING'
    });
    return await order.save();
  }

  static async getOrderById(id: string): Promise<IOrder | null> {
    return await Order.findById(id);
  }
}
