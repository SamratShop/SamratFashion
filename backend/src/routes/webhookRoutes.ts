import { Router } from 'express';
import { razorpayWebhook } from '../controllers/webhookController';
import { handleLogisticsWebhook } from '../controllers/logisticsWebhookController';
import { webhookLimiter } from '../middleware/rateLimiters';

const router = Router();

router.use(webhookLimiter);

router.post('/razorpay', razorpayWebhook);
router.post('/webhook', razorpayWebhook);
router.post('/', razorpayWebhook);
router.post('/logistics', handleLogisticsWebhook);

export default router;
