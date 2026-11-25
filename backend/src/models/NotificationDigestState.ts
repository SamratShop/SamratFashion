import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INotificationDigestState extends Document {
  key: string;
  lastDigestAt: Date;
  lastOrderId?: Types.ObjectId;
  lastOrderNumber?: string;
  orderCountLastDigest?: number;
  totalValueLastDigest?: number;
  updatedAt: Date;
}

const notificationDigestStateSchema = new Schema<INotificationDigestState>(
  {
    key: { type: String, required: true, unique: true, default: 'admin_order_digest' },
    lastDigestAt: { type: Date, required: true, default: Date.now },
    lastOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    lastOrderNumber: { type: String },
    orderCountLastDigest: { type: Number, default: 0 },
    totalValueLastDigest: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const NotificationDigestState = mongoose.model<INotificationDigestState>(
  'NotificationDigestState',
  notificationDigestStateSchema
);
