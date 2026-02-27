import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  customerId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'CANCELLED';
  totalAmount: number;
}

const OrderSchema: Schema = new Schema({
  customerId: { type: String, required: true },
  items: [{
    productId: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true }
  }],
  status: { type: String, enum: ['PENDING', 'PAID', 'SHIPPED', 'CANCELLED'], default: 'PENDING' },
  totalAmount: { type: Number, required: true }
}, { timestamps: true });

export default mongoose.model<IOrder>('Order', OrderSchema);
