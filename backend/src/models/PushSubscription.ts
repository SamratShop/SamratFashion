import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPushSubscription extends Document {
  userId: Types.ObjectId;
  role: 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const pushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'], default: 'CUSTOMER', required: true, index: true },
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness per user and endpoint
pushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });

export const PushSubscription = mongoose.model<IPushSubscription>('PushSubscription', pushSubscriptionSchema);
