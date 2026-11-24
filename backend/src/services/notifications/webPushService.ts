import webpush from 'web-push';
import mongoose, { Types } from 'mongoose';
import { PushSubscription, IPushSubscription } from '../../models/PushSubscription';

let vapidConfigured = false;

function ensureVapidConfig(): boolean {
  if (vapidConfigured) return true;

  const publicKey = (process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  let subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:support@samratfashion.com';
  if (subject && !subject.startsWith('mailto:') && !subject.startsWith('http://') && !subject.startsWith('https://')) {
    subject = `mailto:${subject}`;
  }

  if (!publicKey || !privateKey) {
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
    return true;
  } catch (err: unknown) {
    console.warn('[WebPush] Failed to initialize VAPID details:', err instanceof Error ? err.message : String(err));
    return false;
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
}

export interface PushDeliveryResult {
  sent: number;
  failed: number;
  unregistered: number;
  error?: string;
}

export class WebPushService {
  public isConfigured(): boolean {
    return ensureVapidConfig();
  }

  public getPublicKey(): string {
    return (process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)?.trim() || '';
  }

  /**
   * Dispatches push notification to a specific subscription.
   * Cleans up expired/unregistered (404/410) subscriptions automatically.
   */
  async sendToSubscription(
    sub: IPushSubscription,
    payload: PushPayload
  ): Promise<{ success: boolean; unregistered?: boolean; error?: string }> {
    if (!ensureVapidConfig()) {
      return { success: false, error: 'VAPID_NOT_CONFIGURED' };
    }

    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
    };

    const notificationData = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/favicon.ico',
      badge: payload.badge || '/favicon.ico',
      url: payload.url || '/',
      tag: payload.tag || 'sf-order-notification',
      ...payload.data,
    });

    try {
      await webpush.sendNotification(pushSubscription, notificationData);
      return { success: true };
    } catch (err: any) {
      const statusCode = err?.statusCode || err?.status;
      if (statusCode === 404 || statusCode === 410) {
        // Subscription is expired or revoked. Delete it from DB.
        console.log(`[WebPush] Removing expired push subscription: ${sub._id}`);
        await PushSubscription.findByIdAndDelete(sub._id).catch(() => {});
        return { success: false, unregistered: true, error: 'SUBSCRIPTION_EXPIRED' };
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Dispatches push notification to all subscriptions belonging to a user.
   * Fail-Safe: Will never throw to caller.
   */
  async sendPushToUser(
    userId: string | Types.ObjectId,
    payload: PushPayload
  ): Promise<PushDeliveryResult> {
    try {
      if (!ensureVapidConfig()) {
        return { sent: 0, failed: 0, unregistered: 0, error: 'VAPID_NOT_CONFIGURED' };
      }

      const subscriptions = await PushSubscription.find({
        userId: new mongoose.Types.ObjectId(userId.toString()),
      });

      if (!subscriptions || subscriptions.length === 0) {
        return { sent: 0, failed: 0, unregistered: 0 };
      }

      let sent = 0;
      let failed = 0;
      let unregistered = 0;

      await Promise.allSettled(
        subscriptions.map(async (sub) => {
          const res = await this.sendToSubscription(sub, payload);
          if (res.success) {
            sent++;
          } else {
            failed++;
            if (res.unregistered) {
              unregistered++;
            }
          }
        })
      );

      return { sent, failed, unregistered };
    } catch (err: unknown) {
      console.error('[WebPush] Error sending push to user:', err);
      return { sent: 0, failed: 1, unregistered: 0, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Dispatches push notification to all active admin/super_admin subscriptions.
   * Used exclusively by the scheduled digest cron endpoint.
   */
  async sendPushToAdmins(payload: PushPayload): Promise<PushDeliveryResult> {
    try {
      if (!ensureVapidConfig()) {
        return { sent: 0, failed: 0, unregistered: 0, error: 'VAPID_NOT_CONFIGURED' };
      }

      const adminSubs = await PushSubscription.find({
        role: { $in: ['ADMIN', 'SUPER_ADMIN'] },
      });

      if (!adminSubs || adminSubs.length === 0) {
        return { sent: 0, failed: 0, unregistered: 0 };
      }

      let sent = 0;
      let failed = 0;
      let unregistered = 0;

      await Promise.allSettled(
        adminSubs.map(async (sub) => {
          const res = await this.sendToSubscription(sub, payload);
          if (res.success) {
            sent++;
          } else {
            failed++;
            if (res.unregistered) {
              unregistered++;
            }
          }
        })
      );

      return { sent, failed, unregistered };
    } catch (err: unknown) {
      console.error('[WebPush] Error sending push to admins:', err);
      return { sent: 0, failed: 1, unregistered: 0, error: err instanceof Error ? err.message : String(err) };
    }
  }
}

export const webPushService = new WebPushService();
