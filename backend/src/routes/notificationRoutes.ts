import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  getCustomerNotifications,
  markNotificationsAsRead,
  getVapidPublicKey,
  subscribePush,
  unsubscribePush,
  getPushStatus,
} from '../controllers/notificationController';

const router = Router();

// In-app notifications
router.get('/', requireAuth, getCustomerNotifications);
router.patch('/mark-read', requireAuth, markNotificationsAsRead);
router.post('/read', requireAuth, markNotificationsAsRead);

// Web Push
router.get('/push/public-key', getVapidPublicKey);
router.get('/push/status', requireAuth, getPushStatus);
router.post('/push/subscribe', requireAuth, subscribePush);
router.post('/push/unsubscribe', requireAuth, unsubscribePush);

export default router;
