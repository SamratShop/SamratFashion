import { Router } from 'express';
import { requireOpsSecret, requireDigestCronSecret } from '../middleware/opsAuth';
import { getPaymentHealth, runRecoveryCycle, sendAdminOrderDigest } from '../controllers/opsController';

const router = Router();

// Operational endpoints are strictly non-cacheable by proxies and CDNs.
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  next();
});

// Admin push notification digest (called by free external cron at 10, 13, 16, 19, 21 IST)
// Authenticated via DIGEST_CRON_SECRET (or OPS_SECRET) with header x-cron-secret
router.post('/notifications/digest', requireDigestCronSecret, sendAdminOrderDigest);

// Operational endpoints are authenticated by a shared secret, not a user JWT.
// See security-audit/PAYMENT_OPERATIONS_RUNBOOK.md.
router.use(requireOpsSecret);

router.get('/payments/health', getPaymentHealth);

// L5: Recovery mutations (reconciliation, refund sweeps) are strictly POST-only
router.post('/recovery/run', runRecoveryCycle);

export default router;
