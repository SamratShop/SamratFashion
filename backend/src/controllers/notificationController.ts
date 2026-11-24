import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { NotificationLog } from '../models/NotificationLog';
import { PushSubscription } from '../models/PushSubscription';
import { webPushService } from '../services/notifications/webPushService';

interface AuthRequest extends Request {
  user?: any;
}

/**
 * GET /api/notifications
 * Retrieves signed-in customer's in-app notifications.
 * Strictly scoped to req.user.id / req.user.email — customer never sees others' records.
 */
export const getCustomerNotifications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userId = req.user.id ? new mongoose.Types.ObjectId(req.user.id) : null;
    const email = req.user.email;

    const query: any = {
      channel: 'IN_APP',
      $or: [],
    };

    if (userId) query.$or.push({ userId });
    if (email) query.$or.push({ recipientEmail: email });

    if (query.$or.length === 0) {
      return res.status(200).json({ success: true, data: { notifications: [], unreadCount: 0 } });
    }

    const [notifications, unreadCount] = await Promise.all([
      NotificationLog.find(query)
        .sort({ createdAt: -1 })
        .limit(30)
        .select('_id eventType title message link read readAt createdAt metadata')
        .lean(),
      NotificationLog.countDocuments({ ...query, read: false }),
    ]);

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (err: unknown) {
    console.error('[NotificationController] Error fetching in-app notifications:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

/**
 * PATCH /api/notifications/mark-read or POST /api/notifications/read
 * Marks unread in-app notifications as read for the signed-in user.
 */
export const markNotificationsAsRead = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userId = req.user.id ? new mongoose.Types.ObjectId(req.user.id) : null;
    const email = req.user.email;

    const query: any = {
      channel: 'IN_APP',
      read: false,
      $or: [],
    };

    if (userId) query.$or.push({ userId });
    if (email) query.$or.push({ recipientEmail: email });

    if (query.$or.length > 0) {
      await NotificationLog.updateMany(query, {
        $set: { read: true, readAt: new Date() },
      });
    }

    return res.status(200).json({
      success: true,
      data: { unreadCount: 0 },
    });
  } catch (err: unknown) {
    console.error('[NotificationController] Error marking notifications as read:', err);
    return res.status(500).json({ success: false, message: 'Failed to mark notifications read' });
  }
};

/**
 * GET /api/notifications/push/public-key
 * Returns VAPID public key so client browser can subscribe to PushManager.
 */
export const getVapidPublicKey = async (_req: Request, res: Response) => {
  const publicKey = webPushService.getPublicKey();
  return res.status(200).json({
    success: true,
    data: {
      publicKey,
      isConfigured: webPushService.isConfigured(),
    },
  });
};

/**
 * POST /api/notifications/push/subscribe
 * Registers or updates a web push subscription for the signed-in user.
 */
export const subscribePush = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { endpoint, keys } = req.body || {};
    if (!endpoint || typeof endpoint !== 'string' || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ success: false, message: 'Invalid push subscription payload' });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const role = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN' ? req.user.role : 'CUSTOMER';
    const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;

    await PushSubscription.findOneAndUpdate(
      { userId, endpoint },
      {
        userId,
        role,
        endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        userAgent,
      },
      { upsert: true, returnDocument: 'after' }
    );

    return res.status(200).json({
      success: true,
      message: 'Push subscription registered successfully',
    });
  } catch (err: unknown) {
    console.error('[NotificationController] Push subscription error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save push subscription' });
  }
};

/**
 * POST /api/notifications/push/unsubscribe
 * Removes push subscription for the signed-in user.
 */
export const unsubscribePush = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { endpoint } = req.body || {};
    const userId = new mongoose.Types.ObjectId(req.user.id);

    if (endpoint) {
      await PushSubscription.deleteOne({ userId, endpoint });
    } else {
      // Unsubscribe all endpoints for this user if no specific endpoint provided
      await PushSubscription.deleteMany({ userId });
    }

    return res.status(200).json({
      success: true,
      message: 'Push subscription removed successfully',
    });
  } catch (err: unknown) {
    console.error('[NotificationController] Push unsubscribe error:', err);
    return res.status(500).json({ success: false, message: 'Failed to remove push subscription' });
  }
};

/**
 * GET /api/notifications/push/status
 * Returns subscription status for the current user.
 */
export const getPushStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const count = await PushSubscription.countDocuments({ userId });

    return res.status(200).json({
      success: true,
      data: {
        isSubscribed: count > 0,
        subscriptionCount: count,
        isConfigured: webPushService.isConfigured(),
      },
    });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: 'Failed to get push status' });
  }
};
