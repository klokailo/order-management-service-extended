import mongoose, { Schema, Document } from 'mongoose';

export interface IIdempotencyKey extends Document {
  key: string;
  path: string;
  method: string;
  lockedAt: Date | null;
  responseBody: any;
  responseStatus: number;
  createdAt: Date;
}

const IdempotencyKeySchema = new Schema({
  key: { type: String, required: true, unique: true },
  path: { type: String, required: true },
  method: { type: String, required: true },
  lockedAt: { type: Date, default: null },
  responseBody: { type: Schema.Types.Mixed },
  responseStatus: { type: Number },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // TTL 24 hours
});

export const IdempotencyKey = mongoose.model<IIdempotencyKey>('IdempotencyKey', IdempotencyKeySchema);
