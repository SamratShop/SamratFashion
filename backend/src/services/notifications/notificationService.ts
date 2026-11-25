import crypto from 'crypto';
import mongoose from 'mongoose';
import { NotificationLog, NotificationChannel, NotificationStatus } from '../../models/NotificationLog';
import { Order } from '../../models/Order';
import { User } from '../../models/User';
import { PushSubscription } from '../../models/PushSubscription';
import { getEmailProvider, SendEmailOptions, SendEmailResult } from './emailProviders';
import { webPushService } from './webPushService';
import {
  getOrderConfirmationTemplate,
  getPaymentSuccessTemplate,
  getPaymentFailedTemplate,
  getOrderShippedTemplate,
  getOrderDeliveredTemplate,
  getOrderCancelledTemplate,
  getRefundProcessedTemplate,
  getReturnStatusTemplate,
  getPasswordResetTemplate,
  getEmailVerificationTemplate
} from './templates/emailTemplates';

function escapeHtml(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface DispatchNotificationOptions {
  eventType: string;
  entityType: string;
  entityId: string | mongoose.Types.ObjectId;
  recipientEmail: string;
  recipientPhone?: string;
  channel?: NotificationChannel;
  idempotencyKey?: string;
  data: Record<string, any>;
}

export interface NotificationDispatchResult {
  success: boolean;
  status: 'SENT' | 'NOT_CONFIGURED' | 'FAILED' | 'SKIPPED';
  provider: string;
  messageId?: string;
  error?: string;
}

function maskRecipientEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  const maskedLocal = local.length <= 2 ? `${local[0]}*` : `${local.slice(0, 2)}***${local.slice(-1)}`;
  return `${maskedLocal}@${domain}`;
}

export class NotificationService {
  /**
   * Asynchronously dispatches a notification.
   * Fail-Safe: Will NEVER throw an unhandled exception to the caller.
   */
  async notify(options: DispatchNotificationOptions): Promise<NotificationDispatchResult> {
    const {
      eventType,
      entityType,
      entityId,
      recipientEmail,
      recipientPhone,
      channel = 'EMAIL',
      data
    } = options;

    if (!recipientEmail || !recipientEmail.includes('@')) {
      console.warn(`[NotificationService] Invalid email address: ${maskRecipientEmail(recipientEmail)}. Notification skipped.`);
      return {
        success: false,
        status: 'SKIPPED',
        provider: 'none',
        error: 'Invalid recipient email address'
      };
    }

    const idempotencyKey =
      options.idempotencyKey || `${eventType}:${entityType}:${entityId.toString()}:${crypto.randomUUID()}`;

    try {
      // 1. Notification Idempotency Check
      const existingLog = await NotificationLog.findOne({ idempotencyKey });
      if (existingLog && existingLog.status === 'SENT') {
        console.log(`[NotificationService] Duplicate event skipped for ${eventType}`);
        return {
          success: true,
          status: 'SENT',
          provider: existingLog.provider || 'idempotent-cache',
          messageId: existingLog.providerMessageId
        };
      }

      // 2. Build Email Options from Template
      const templateResult = this.buildTemplate(eventType, data);
      if (!templateResult) {
        console.warn(`[NotificationService] No email template mapped for eventType: ${eventType}`);
        return {
          success: false,
          status: 'FAILED',
          provider: 'none',
          error: `No email template mapped for eventType: ${eventType}`
        };
      }

      const emailOptions: SendEmailOptions = {
        to: recipientEmail,
        subject: templateResult.subject,
        html: templateResult.html,
        text: templateResult.text
      };

      // 3. Provider Selection & Dispatch
      const provider = getEmailProvider();
      const result: SendEmailResult = await provider.sendEmail(emailOptions);

      const status = result.success
        ? 'SENT'
        : result.error === 'EMAIL PROVIDER NOT CONFIGURED'
        ? 'NOT_CONFIGURED'
        : 'FAILED';
      // 4. Record Notification Log
      await NotificationLog.findOneAndUpdate(
        { idempotencyKey },
        {
          eventType,
          entityType,
          entityId: new mongoose.Types.ObjectId(entityId.toString()),
          recipientEmail,
          recipientPhone,
          channel,
          status,
          provider: result.provider,
          providerMessageId: result.messageId,
          sentAt: result.success ? new Date() : undefined,
          lastError: result.error,
          idempotencyKey,
          $inc: { attemptCount: 1 }
        },
        { upsert: true, returnDocument: 'after' }
      );

      // 5. In-App Notification and Customer Web Push Dispatch (Fail-safe)
      await this.dispatchInAppAndPush({
        eventType,
        entityType,
        entityId,
        recipientEmail,
        recipientPhone,
        data,
        idempotencyKey,
      }).catch((inAppErr) => {
        console.warn('[NotificationService] In-app/push dispatch skipped or failed:', inAppErr);
      });

      console.log(`[NotificationService] Notification dispatched: ${eventType} -> ${maskRecipientEmail(recipientEmail)} [Status: ${status}]`);
      return {
        success: result.success,
        status,
        provider: result.provider,
        messageId: result.messageId,
        error: result.error
      };
    } catch (err: unknown) {
      // CRITICAL OBSERVER RULE: Catch all errors silently to protect business transactions
      const errorMessage = err instanceof Error ? err.message : String(err || 'Unknown exception');
      console.error(`[NotificationService Exception] Error sending notification for ${eventType}:`, errorMessage);
      
      try {
        await NotificationLog.findOneAndUpdate(
          { idempotencyKey },
          {
            eventType,
            entityType,
            entityId: new mongoose.Types.ObjectId(entityId.toString()),
            recipientEmail,
            recipientPhone,
            channel,
            status: 'FAILED',
            provider: 'unknown',
            lastError: errorMessage,
            idempotencyKey,
            $inc: { attemptCount: 1 }
          },
          { upsert: true, returnDocument: 'after' }
        );
      } catch (logErr: unknown) {
        console.error('[NotificationService Exception] Failed to record error log:', logErr instanceof Error ? logErr.message : String(logErr));
      }

      return {
        success: false,
        status: 'FAILED',
        provider: 'unknown',
        error: errorMessage
      };
    }
  }

  private buildTemplate(eventType: string, data: any): { subject: string; html: string; text: string } | null {
    switch (eventType) {
      case 'ORDER_CONFIRMED':
      case 'ORDER_CREATED':
        return getOrderConfirmationTemplate(data as any);
      case 'PAYMENT_SUCCESS':
        return getPaymentSuccessTemplate(data as any);
      case 'PAYMENT_FAILED':
        return getPaymentFailedTemplate(data as any);
      case 'ORDER_SHIPPED':
        return getOrderShippedTemplate(data as any);
      case 'ORDER_DELIVERED':
        return getOrderDeliveredTemplate(data as any);
      case 'ORDER_CANCELLED':
        return getOrderCancelledTemplate(data as any);
      case 'REFUND_PROCESSED':
        return getRefundProcessedTemplate(data as any);
      case 'RETURN_STATUS_UPDATED':
      case 'RETURN_APPROVED':
      case 'RETURN_REJECTED':
        return getReturnStatusTemplate(data as any);
      case 'PASSWORD_RESET_REQUESTED':
        return getPasswordResetTemplate(data as any);
      case 'EMAIL_VERIFICATION':
        return getEmailVerificationTemplate(data as any);
      case 'MOCKUP_SENT':
        return {
          subject: `Mockup Ready for Review — Order #${data.orderNumber || ''}`,
          html: `<div style="font-family: sans-serif; padding: 20px;"><h2>Design Mockup Ready for Review</h2><p>Hi ${escapeHtml(data.customerName || 'Customer')},</p><p>Our design team has uploaded a high-resolution mockup for your custom order <strong>#${escapeHtml(data.orderNumber || '')}</strong>.</p><p>Please log in to your account and review the mockup image under Order Details to approve or request changes.</p></div>`,
          text: `Design Mockup Ready for Review — Order #${data.orderNumber || ''}. Log in to approve or request changes.`
        };
      case 'MOCKUP_APPROVED':
        return {
          subject: `Mockup Approved — Order #${data.orderNumber || ''}`,
          html: `<div style="font-family: sans-serif; padding: 20px;"><h2>Mockup Approved</h2><p>Order <strong>#${escapeHtml(data.orderNumber || '')}</strong> design mockup has been approved by the customer. The order is now cleared for production dispatch.</p></div>`,
          text: `Mockup Approved for Order #${data.orderNumber || ''}. Cleared for production.`
        };
      case 'MOCKUP_REVISION_REQUESTED':
        return {
          subject: `Revision Requested — Order #${data.orderNumber || ''}`,
          html: `<div style="font-family: sans-serif; padding: 20px;"><h2>Revision Requested</h2><p>The customer requested changes for order <strong>#${escapeHtml(data.orderNumber || '')}</strong>.</p><p><strong>Customer Note:</strong> ${escapeHtml(data.note || 'No note provided')}</p></div>`,
          text: `Revision Requested for Order #${data.orderNumber || ''}. Note: ${data.note || ''}`
        };
      default:
        return null;
    }
  }

  /**
   * Internal helper to create in-app notification records and dispatch immediate customer web pushes.
   * Fail-Safe: Catches and logs errors without bubbling up to callers.
   */
  private async dispatchInAppAndPush(options: {
    eventType: string;
    entityType: string;
    entityId: string | mongoose.Types.ObjectId;
    recipientEmail: string;
    recipientPhone?: string;
    data: Record<string, any>;
    idempotencyKey: string;
  }): Promise<void> {
    const { eventType, entityType, entityId, recipientEmail, data, idempotencyKey } = options;

    const inAppContent = this.buildInAppContent(eventType, entityId.toString(), data);
    if (!inAppContent) {
      return;
    }

    // Resolve customer userId
    let userId: mongoose.Types.ObjectId | undefined = undefined;
    if (data.userId && mongoose.Types.ObjectId.isValid(data.userId)) {
      userId = new mongoose.Types.ObjectId(data.userId.toString());
    } else if (entityType.toUpperCase() === 'ORDER') {
      const order = await Order.findById(entityId).select('userId').lean();
      if (order && (order as any).userId) {
        userId = new mongoose.Types.ObjectId((order as any).userId.toString());
      }
    }

    if (!userId) {
      const user = await User.findOne({ email: recipientEmail }).select('_id').lean();
      if (user) {
        userId = new mongoose.Types.ObjectId((user as any)._id.toString());
      }
    }

    const inAppIdempotencyKey = `${idempotencyKey}:IN_APP`;

    // 1. Write IN_APP notification record in NotificationLog
    await NotificationLog.findOneAndUpdate(
      { idempotencyKey: inAppIdempotencyKey },
      {
        eventType,
        entityType,
        entityId: new mongoose.Types.ObjectId(entityId.toString()),
        recipientEmail,
        userId,
        channel: 'IN_APP',
        status: 'SENT',
        provider: 'in_app',
        title: inAppContent.title,
        message: inAppContent.message,
        link: inAppContent.link,
        read: false,
        sentAt: new Date(),
        idempotencyKey: inAppIdempotencyKey,
        metadata: data,
        $inc: { attemptCount: 1 },
      },
      { upsert: true, returnDocument: 'after' }
    );

    // 2. Customer Web Push (Immediate, Async non-blocking)
    if (userId) {
      webPushService.sendPushToUser(userId, {
        title: inAppContent.title,
        body: inAppContent.message,
        url: inAppContent.link,
        tag: `sf-${eventType.toLowerCase()}-${entityId.toString()}`,
        data: {
          orderId: entityId.toString(),
          eventType,
        },
      }).catch((pushErr) => {
        console.warn('[NotificationService] Customer web push failed:', pushErr);
      });
    }

    // 3. Admin Immediate Web Push (Immediate, Async non-blocking)
    // Sends immediate push to all opted-in admin devices on order events:
    // ORDER_CONFIRMED, ORDER_SHIPPED, ORDER_DELIVERED, ORDER_CANCELLED, REFUND_PROCESSED.
    // Fires asynchronously without awaiting, so it never blocks or slows the request path.
    this.sendAdminImmediatePush(eventType, entityId.toString(), data).catch((adminPushErr) => {
      console.warn('[NotificationService] Immediate admin push failed:', adminPushErr);
    });
  }

  /**
   * Builds admin push content for immediate order events.
   * Content: order number + status + total value.
   * e.g. "New order #SF-... — ₹X" or "Order #SF-... shipped via <carrier> — ₹X"
   * Clicking it opens /admin/orders.
   */
  public async buildAdminPushContent(
    eventType: string,
    entityId: string,
    data: Record<string, any>
  ): Promise<{ title: string; body: string; url: string; tag: string } | null> {
    const adminEvents = new Set([
      'ORDER_CONFIRMED',
      'ORDER_CREATED',
      'ORDER_SHIPPED',
      'ORDER_DELIVERED',
      'ORDER_CANCELLED',
      'REFUND_PROCESSED',
    ]);

    if (!adminEvents.has(eventType)) {
      return null;
    }

    let orderNumber = data.orderNumber;
    let total = data.total ?? data.amount;

    if ((!orderNumber || total === undefined) && entityId && mongoose.Types.ObjectId.isValid(entityId)) {
      try {
        const orderDoc = await Order.findById(entityId).select('orderNumber total').lean();
        if (orderDoc) {
          if (!orderNumber) orderNumber = orderDoc.orderNumber;
          if (total === undefined) total = orderDoc.total;
        }
      } catch {
        // fail-safe ignore
      }
    }

    const formattedOrderNum = orderNumber ? `#${orderNumber}` : (entityId ? `#${String(entityId).slice(-6)}` : '');
    const numTotal = Number(total || 0);
    const formattedTotal = `₹${numTotal.toLocaleString('en-IN')}`;

    switch (eventType) {
      case 'ORDER_CONFIRMED':
      case 'ORDER_CREATED':
        return {
          title: `New Order ${formattedOrderNum}`.trim(),
          body: `New order ${formattedOrderNum} — ${formattedTotal}`.trim(),
          url: '/admin/orders',
          tag: `admin-order-${entityId}-confirmed`,
        };
      case 'ORDER_SHIPPED': {
        const carrierPart = data.carrier ? ` shipped via ${data.carrier}` : ' shipped';
        return {
          title: `Order ${formattedOrderNum} Shipped`.trim(),
          body: `Order ${formattedOrderNum}${carrierPart} — ${formattedTotal}`.trim(),
          url: '/admin/orders',
          tag: `admin-order-${entityId}-shipped`,
        };
      }
      case 'ORDER_DELIVERED':
        return {
          title: `Order ${formattedOrderNum} Delivered`.trim(),
          body: `Order ${formattedOrderNum} delivered — ${formattedTotal}`.trim(),
          url: '/admin/orders',
          tag: `admin-order-${entityId}-delivered`,
        };
      case 'ORDER_CANCELLED':
        return {
          title: `Order ${formattedOrderNum} Cancelled`.trim(),
          body: `Order ${formattedOrderNum} cancelled — ${formattedTotal}`.trim(),
          url: '/admin/orders',
          tag: `admin-order-${entityId}-cancelled`,
        };
      case 'REFUND_PROCESSED':
        return {
          title: `Refund Processed ${formattedOrderNum}`.trim(),
          body: `Refund of ${formattedTotal} processed for order ${formattedOrderNum}`.trim(),
          url: '/admin/orders',
          tag: `admin-order-${entityId}-refund`,
        };
      default:
        return null;
    }
  }

  /**
   * Dispatches immediate web push to all opted-in admins on order events.
   * Fail-Safe: Will never throw to caller and runs non-blocking.
   * Reuses webPushService.sendPushToUser and existing PushSubscription records.
   */
  public async sendAdminImmediatePush(
    eventType: string,
    entityId: string,
    data: Record<string, any>
  ): Promise<void> {
    try {
      const adminPushContent = await this.buildAdminPushContent(eventType, entityId, data);
      if (!adminPushContent) {
        return;
      }

      // Find all distinct admin userIds with active subscriptions
      const adminUserIds = await PushSubscription.distinct('userId', {
        role: { $in: ['ADMIN', 'SUPER_ADMIN'] },
      });

      if (!adminUserIds || adminUserIds.length === 0) {
        return;
      }

      const orderNumber = data.orderNumber || (entityId ? String(entityId).slice(-6) : '');

      // Send to each opted-in admin user via webPushService.sendPushToUser
      await Promise.allSettled(
        adminUserIds.map((adminId) =>
          webPushService.sendPushToUser(adminId, {
            title: adminPushContent.title,
            body: adminPushContent.body,
            url: adminPushContent.url,
            tag: adminPushContent.tag,
            data: {
              orderId: entityId,
              orderNumber,
              eventType,
              role: 'ADMIN',
            },
          })
        )
      );
    } catch (err: unknown) {
      console.warn(
        '[NotificationService] Failed to dispatch immediate admin push:',
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  private buildInAppContent(
    eventType: string,
    entityId: string,
    data: any
  ): { title: string; message: string; link: string } | null {
    const orderNumber = data.orderNumber || '';
    const orderLink = `/account/orders/${data.orderId || entityId}`;

    switch (eventType) {
      case 'ORDER_CONFIRMED':
      case 'ORDER_CREATED':
        return {
          title: `Order Confirmed #${orderNumber}`,
          message: `Your order for ₹${data.total || data.amount || 0} has been confirmed.`,
          link: orderLink,
        };
      case 'ORDER_SHIPPED':
        return {
          title: `Order Shipped #${orderNumber}`,
          message: `Your order has shipped${data.carrier ? ` via ${data.carrier}` : ''}${data.trackingNumber ? ` (AWB: ${data.trackingNumber})` : ''}.`,
          link: orderLink,
        };
      case 'ORDER_DELIVERED':
        return {
          title: `Order Delivered #${orderNumber}`,
          message: `Your package for order #${orderNumber} has been delivered.`,
          link: orderLink,
        };
      case 'ORDER_CANCELLED':
        return {
          title: `Order Cancelled #${orderNumber}`,
          message: `Your order #${orderNumber} has been cancelled.`,
          link: orderLink,
        };
      case 'REFUND_PROCESSED':
        return {
          title: `Refund Processed #${orderNumber}`,
          message: `Refund of ₹${data.amount || 0} has been processed for order #${orderNumber}.`,
          link: orderLink,
        };
      case 'MOCKUP_SENT':
        return {
          title: `Mockup Ready #${orderNumber}`,
          message: `A custom design mockup is ready for your review.`,
          link: orderLink,
        };
      case 'MOCKUP_APPROVED':
        return {
          title: `Mockup Approved #${orderNumber}`,
          message: `Your design mockup has been approved and moved to production.`,
          link: orderLink,
        };
      case 'MOCKUP_REVISION_REQUESTED':
        return {
          title: `Revision Requested #${orderNumber}`,
          message: `Your revision request for mockup has been submitted.`,
          link: orderLink,
        };
      default:
        return null;
    }
  }

  public async resendNotification(logId: string | mongoose.Types.ObjectId): Promise<{
    success: boolean;
    status: NotificationStatus;
    provider: string;
    messageId?: string;
    error?: string;
  }> {
    const log = await NotificationLog.findById(logId);
    if (!log) {
      throw new Error("Notification log entry not found");
    }

    if (log.status === 'SENT') {
      return {
        success: true,
        status: 'SENT',
        provider: log.provider,
        messageId: log.providerMessageId,
      };
    }

    // N-M17: Deleted order email resend guard
    // Never resend a notification for an order that no longer exists in the database.
    // If the order exists, re-fetch live order data to prevent sending "#N/A / ₹0" emails.
    const ORDER_EVENT_TYPES = new Set([
      'ORDER_CREATED',
      'ORDER_CONFIRMED',
      'PAYMENT_SUCCESS',
      'PAYMENT_FAILED',
      'ORDER_SHIPPED',
      'ORDER_DELIVERED',
      'ORDER_CANCELLED',
      'REFUND_PROCESSED',
      'RETURN_STATUS_UPDATED',
      'RETURN_APPROVED',
      'RETURN_REJECTED',
      'MOCKUP_SENT',
      'MOCKUP_APPROVED',
      'MOCKUP_REVISION_REQUESTED',
    ]);

    const isOrderEntity =
      (log.entityType && log.entityType.toUpperCase() === 'ORDER') ||
      ORDER_EVENT_TYPES.has(log.eventType) ||
      Boolean(log.metadata?.orderId);

    let templateData = log.metadata || {};

    if (isOrderEntity) {
      let targetOrderId: mongoose.Types.ObjectId | string | undefined;
      if (log.entityType && log.entityType.toUpperCase() === 'ORDER') {
        targetOrderId = log.entityId;
      } else if (log.metadata?.orderId) {
        targetOrderId = log.metadata.orderId;
      } else if (ORDER_EVENT_TYPES.has(log.eventType)) {
        targetOrderId = log.entityId;
      }

      if (targetOrderId) {
        const liveOrder = await Order.findById(targetOrderId).populate('userId');
        if (!liveOrder) {
          const err = `Cannot resend notification: referenced order ${targetOrderId} does not exist or has been deleted`;
          console.warn(`[NotificationService] ${err}`);
          await NotificationLog.findByIdAndUpdate(log._id, {
            $set: { lastError: err },
            $inc: { attemptCount: 1 },
          });
          return {
            success: false,
            status: 'FAILED',
            provider: log.provider || 'none',
            error: err,
          };
        }

        // Re-fetch live order data at resend time and render from live state — never from stale metadata alone
        const orderUser = liveOrder.userId as any;
        const customerName =
          orderUser?.name ||
          liveOrder.shippingAddress?.fullName ||
          log.metadata?.customerName ||
          'Customer';

        templateData = {
          ...(log.metadata || {}),
          customerName,
          orderNumber: liveOrder.orderNumber,
          items: liveOrder.items,
          total: liveOrder.total,
          amount: liveOrder.total,
          shippingAddress: liveOrder.shippingAddress,
          status: liveOrder.status,
          paymentStatus: liveOrder.paymentStatus,
          tracking: (liveOrder as any).tracking,
        };

        // Keep NotificationLog metadata in sync with live order
        await NotificationLog.findByIdAndUpdate(log._id, {
          $set: { metadata: templateData },
        });
      }
    } else if (log.entityType && log.entityType.toUpperCase() === 'USER') {
      const liveUser = await User.findById(log.entityId);
      if (!liveUser) {
        const err = `Cannot resend notification: referenced user ${log.entityId} does not exist or has been deleted`;
        console.warn(`[NotificationService] ${err}`);
        await NotificationLog.findByIdAndUpdate(log._id, {
          $set: { lastError: err },
          $inc: { attemptCount: 1 },
        });
        return {
          success: false,
          status: 'FAILED',
          provider: log.provider || 'none',
          error: err,
        };
      }
    }

    const templateResult = this.buildTemplate(log.eventType, templateData);
    if (!templateResult) {
      const err = `No email template mapped for eventType: ${log.eventType}`;
      await NotificationLog.findByIdAndUpdate(log._id, {
        $set: { lastError: err },
        $inc: { attemptCount: 1 },
      });
      return {
        success: false,
        status: 'FAILED',
        provider: log.provider || 'none',
        error: err,
      };
    }

    const provider = getEmailProvider();
    const result: SendEmailResult = await provider.sendEmail({
      to: log.recipientEmail,
      subject: templateResult.subject,
      html: templateResult.html,
      text: templateResult.text,
    });

    const status: NotificationStatus = result.success
      ? 'SENT'
      : result.error === 'EMAIL PROVIDER NOT CONFIGURED'
      ? 'NOT_CONFIGURED'
      : 'FAILED';

    await NotificationLog.findByIdAndUpdate(log._id, {
      $set: {
        status,
        provider: result.provider,
        providerMessageId: result.messageId,
        sentAt: result.success ? new Date() : undefined,
        lastError: result.error,
      },
      $inc: { attemptCount: 1 },
    });

    return {
      success: result.success,
      status,
      provider: result.provider,
      messageId: result.messageId,
      error: result.error,
    };
  }
}

export const notificationService = new NotificationService();
