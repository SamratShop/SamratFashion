import mongoose, { Document, Schema, Types } from 'mongoose';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP' | 'PUSH';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'NOT_CONFIGURED';

export interface INotificationLog extends Document {
  eventType: string;
  entityType: string;
  entityId: Types.ObjectId;
  recipientEmail: string;
  recipientPhone?: string;
  userId?: Types.ObjectId;
  channel: NotificationChannel;
  status: NotificationStatus;
  provider: string;
  providerMessageId?: string;
  title?: string;
  message?: string;
  link?: string;
  read?: boolean;
  readAt?: Date;
  attemptCount: number;
  idempotencyKey: string;
  sentAt?: Date;
  lastError?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationLogSchema = new Schema<INotificationLog>(
  {
    eventType: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    recipientEmail: { type: String, required: true },
    recipientPhone: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    channel: { type: String, enum: ['EMAIL', 'SMS', 'WHATSAPP', 'IN_APP', 'PUSH'], default: 'EMAIL', required: true },
    status: { type: String, enum: ['PENDING', 'SENT', 'FAILED', 'NOT_CONFIGURED'], default: 'PENDING', required: true, index: true },
    provider: { type: String, required: true, default: 'console' },
    providerMessageId: { type: String },
    title: { type: String },
    message: { type: String },
    link: { type: String },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    attemptCount: { type: Number, default: 1, min: 1 },
    idempotencyKey: { type: String, required: true, unique: true, index: true },
    sentAt: { type: Date },
    lastError: { type: String },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

notificationLogSchema.index({ userId: 1, channel: 1, createdAt: -1 });
notificationLogSchema.index({ userId: 1, channel: 1, read: 1, createdAt: -1 });
notificationLogSchema.index({ recipientEmail: 1, channel: 1, createdAt: -1 });
notificationLogSchema.index({ recipientEmail: 1, channel: 1, read: 1, createdAt: -1 });
notificationLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 120 * 24 * 60 * 60 });

export const NotificationLog = mongoose.model<INotificationLog>('NotificationLog', notificationLogSchema);
