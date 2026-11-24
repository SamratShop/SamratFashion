import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { getPaymentHealthReport } from '../services/payment/paymentHealthService';
import { RecoveryCoordinatorService } from '../services/recovery/recoveryCoordinatorService';
import { Order } from '../models/Order';
import { NotificationDigestState } from '../models/NotificationDigestState';
import { webPushService } from '../services/notifications/webPushService';

/**
 * GET /api/ops/payments/health
 *
 * Returns 503 when the report is critical so uptime monitors can alert without
 * parsing the body. The body always contains the full diagnosis.
 */
export const getPaymentHealth = catchAsync(async (_req: Request, res: Response) => {
  const report = await getPaymentHealthReport();
  res.status(report.status === 'critical' ? 503 : 200).json({
    success: report.status !== 'critical',
    data: report,
  });
});

/**
 * GET|POST /api/ops/recovery/run
 *
 * Runs exactly one coordinated recovery cycle. Safe to call repeatedly: the
 * distributed lease makes concurrent invocations no-ops and every step is
 * idempotent. This is the serverless replacement for the embedded scheduler.
 */
export const runRecoveryCycle = catchAsync(async (req: Request, res: Response) => {
  const raw =
    (req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>).batchLimit : undefined) ??
    req.query.batchLimit;

  const parsed = Number(raw);
  const batchLimit = Number.isFinite(parsed)
    ? Math.min(Math.max(Math.trunc(parsed), 1), 100)
    : 20;

  const report = await RecoveryCoordinatorService.executeCoordinatedRecoveryCycle({ batchLimit });
  res.status(200).json({
    success: true,
    data: report,
  });
});

/**
 * POST /api/ops/notifications/digest
 *
 * Collects orders placed since the last digest and sends one push to each opted-in admin:
 * count + order numbers + total value (e.g. "3 naye orders — SF-..., SF-..., SF-... — total ₹X").
 * If no new orders arrived since the last digest, sends nothing.
 *
 * Idempotent: Persists last-digest time in MongoDB so retried or overlapping cron calls
 * never resend the same orders.
 */
export const sendAdminOrderDigest = catchAsync(async (_req: Request, res: Response) => {
  const now = new Date();

  // Find or create the digest state
  let state = await NotificationDigestState.findOne({ key: 'admin_order_digest' });
  if (!state) {
    // If running for the first time, look back up to 24 hours
    const defaultStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    state = await NotificationDigestState.create({
      key: 'admin_order_digest',
      lastDigestAt: defaultStart,
    });
  }

  const queryWindowStart = state.lastDigestAt;

  // Find orders created since lastDigestAt that are paid and not cancelled or expired
  const newOrders = await Order.find({
    createdAt: { $gt: queryWindowStart },
    status: { $nin: ['CANCELLED', 'EXPIRED'] },
    paymentStatus: 'PAID',
  })
    .sort({ createdAt: 1 })
    .select('_id orderNumber total createdAt')
    .lean();

  if (newOrders.length === 0) {
    // Advance the window to avoid expanding the scan range indefinitely
    state.lastDigestAt = now;
    await state.save();

    return res.status(200).json({
      success: true,
      message: 'No new orders since last digest',
      ordersCount: 0,
      windowStart: queryWindowStart,
      windowEnd: now,
    });
  }

  const count = newOrders.length;
  const orderNumbers = newOrders.map((o) => `#${o.orderNumber}`).join(', ');
  const totalValue = newOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  const title = `${count} naye order${count > 1 ? 's' : ''} — Samrat Fashion`;
  const body = `${count} naye order${count > 1 ? 's' : ''} (${orderNumbers}) — total ₹${totalValue.toLocaleString('en-IN')}`;

  // Advance state before dispatching so overlapping retries never double-send
  const latestOrder = newOrders[newOrders.length - 1];
  const digestTimestamp = latestOrder.createdAt ? new Date(latestOrder.createdAt) : now;

  state.lastDigestAt = digestTimestamp > now ? digestTimestamp : now;
  state.lastOrderId = latestOrder._id;
  state.lastOrderNumber = latestOrder.orderNumber;
  state.orderCountLastDigest = count;
  state.totalValueLastDigest = totalValue;
  await state.save();

  // Dispatch Web Push to all opted-in admins
  const pushResult = await webPushService.sendPushToAdmins({
    title,
    body,
    url: '/admin/orders',
    tag: `admin-digest-${Date.now()}`,
    data: {
      type: 'ADMIN_ORDER_DIGEST',
      orderCount: count,
      totalValue,
    },
  });

  return res.status(200).json({
    success: true,
    message: `Dispatched digest for ${count} order(s) to admins`,
    ordersCount: count,
    orderNumbers: newOrders.map((o) => o.orderNumber),
    totalValue,
    pushResult,
  });
});
