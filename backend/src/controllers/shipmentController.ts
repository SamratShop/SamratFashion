import { Request, Response } from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { Shipment } from '../models/Shipment';
import { Fulfillment, FulfillmentStatus } from '../models/Fulfillment';
import { AuditLog } from '../models/AuditLog';
import { AppError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { logisticsService } from '../services/logistics/logisticsService';
import { generateShippingLabelPDFBuffer } from '../utils/pdfLabelGenerator';
import { notificationService } from '../services/notifications/notificationService';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Parses an optional YYYY-MM-DD pickup date (IST calendar day) and rejects
 * malformed or past dates so NimbusPost never receives an invalid schedule.
 */
function parsePickupDate(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    throw new AppError('pickupDate must be a valid date in YYYY-MM-DD format.', 400, 'INVALID_PICKUP_DATE');
  }

  const [year, month, day] = value.trim().split('-').map(Number);
  const requestedUtc = Date.UTC(year, month - 1, day);
  const requested = new Date(requestedUtc);

  if (
    requested.getUTCFullYear() !== year ||
    requested.getUTCMonth() !== month - 1 ||
    requested.getUTCDate() !== day
  ) {
    throw new AppError('pickupDate is not a valid calendar date.', 400, 'INVALID_PICKUP_DATE');
  }

  const now = new Date();
  const shiftedNow = new Date(now.getTime() + IST_OFFSET_MS);
  const startOfTodayIst = new Date(
    Date.UTC(
      shiftedNow.getUTCFullYear(),
      shiftedNow.getUTCMonth(),
      shiftedNow.getUTCDate()
    ) - IST_OFFSET_MS
  );

  if (requestedUtc < startOfTodayIst.getTime()) {
    throw new AppError('pickupDate cannot be in the past.', 400, 'INVALID_PICKUP_DATE');
  }

  return requested;
}

/**
 * POST /api/admin/orders/:id/shipment
 * Create shipment with logistics provider & AWB generation
 */
export const createShipment = catchAsync(async (req: AuthRequest, res: Response) => {
  const orderId = req.params.id as string;
  const { weightGrams, lengthCm, widthCm, heightCm, mode, carrier: manualCarrier, trackingNumber: manualTrackingNumber } = req.body;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new AppError('Invalid order ID', 400);
  }

  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404);

  // Idempotency check: if shipment already exists, return existing shipment.
  // This must run before the order-status guard: a successful booking advances
  // the order to SHIPPED, and a retry should not be rejected.
  const existingShipment = await Shipment.findOne({ orderId: order._id });
  if (existingShipment) {
    return res.status(200).json({ success: true, data: existingShipment, message: 'Shipment already created' });
  }

  // Validate allowed order status
  if (!['PROCESSING', 'CONFIRMED'].includes(order.status)) {
    throw new AppError('Shipment can only be created for CONFIRMED or PROCESSING orders', 400);
  }

  const now = new Date();
  const pkgDetails = {
    weightGrams: Math.max(1, Number(weightGrams) || 500),
    lengthCm: Math.max(1, Number(lengthCm) || 30),
    widthCm: Math.max(1, Number(widthCm) || 25),
    heightCm: Math.max(1, Number(heightCm) || 5)
  };

  let shipment;

  if (mode === 'MANUAL') {
    if (!manualCarrier || typeof manualCarrier !== 'string' || !manualCarrier.trim()) {
      throw new AppError('Carrier name is required in manual dispatch mode', 400);
    }
    if (!manualTrackingNumber || typeof manualTrackingNumber !== 'string' || !manualTrackingNumber.trim()) {
      throw new AppError('Tracking / AWB Number is required in manual dispatch mode', 400);
    }

    const trimmedCarrier = manualCarrier.trim();
    const trimmedAwb = manualTrackingNumber.trim();

    shipment = await Shipment.create({
      orderId: order._id,
      userId: order.userId,
      carrier: trimmedCarrier,
      trackingNumber: trimmedAwb,
      awbNumber: trimmedAwb,
      provider: 'manual',
      status: 'LABEL_CREATED',
      trackingHistory: [
        {
          status: 'LABEL_CREATED',
          location: 'Fulfillment Warehouse',
          description: `Manual shipment dispatched via ${trimmedCarrier}`,
          timestamp: now,
          providerEventId: `manual_${Date.now()}`
        }
      ],
      packageDetails: pkgDetails,
      createdBy: req.user!.id,
      updatedBy: req.user!.id
    });

    await AuditLog.create({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: 'ADMIN_SHIPMENT_CREATED',
      entityType: 'ORDER',
      entityId: order._id,
      metadata: { mode: 'MANUAL', shipmentId: shipment._id, awbNumber: trimmedAwb, carrier: trimmedCarrier, packageDetails: pkgDetails }
    });
  } else {
    // Provider-driven shipment creation
    const { courierId, provider: requestedProvider } = req.body;
    const provider = logisticsService.getProvider(requestedProvider || process.env.LOGISTICS_PROVIDER);

    const providerRes = await provider.createShipment({
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      courierId: courierId || undefined,
      recipient: {
        fullName: order.shippingAddress.fullName,
        phone: order.shippingAddress.phone,
        alternatePhone: order.shippingAddress.alternatePhone,
        addressLine1: order.shippingAddress.addressLine1,
        addressLine2: order.shippingAddress.addressLine2,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        postalCode: order.shippingAddress.postalCode,
        country: order.shippingAddress.country || 'India'
      },
      items: order.items.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        sku: item.sku,
        selectedColor: item.selectedColor,
        selectedSize: item.selectedSize
      })),
      packageDetails: pkgDetails,
      codAmount: order.paymentStatus === 'PENDING' ? order.total : 0
    });
    shipment = await Shipment.create({
      orderId: order._id,
      userId: order.userId,
      carrier: providerRes.carrier,
      trackingNumber: providerRes.awbNumber,
      awbNumber: providerRes.awbNumber,
      providerShipmentId: providerRes.providerShipmentId,
      provider: provider.name,
      trackingUrl: providerRes.trackingUrl,
      labelUrl: providerRes.labelUrl,
      status: 'LABEL_CREATED',
      trackingHistory: [
        {
          status: 'LABEL_CREATED',
          location: 'Fulfillment Warehouse',
          description: 'Shipment created and AWB assigned',
          timestamp: now,
          providerEventId: `init_${providerRes.awbNumber}`
        }
      ],
      packageDetails: pkgDetails,
      createdBy: req.user!.id,
      updatedBy: req.user!.id
    });

    await AuditLog.create({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: 'ADMIN_SHIPMENT_CREATED',
      entityType: 'ORDER',
      entityId: order._id,
      metadata: { mode: 'PROVIDER', provider: provider.name, shipmentId: shipment._id, awbNumber: shipment.awbNumber, carrier: shipment.carrier, packageDetails: pkgDetails }
    });

    // Advance order and fulfillment statuses upon successful shipment dispatch
    order.status = 'SHIPPED';
    await order.save();

    try {
      const customer = await User.findById(order.userId).select('name email');
      if (customer && customer.email) {
        notificationService.notify({
          eventType: 'ORDER_SHIPPED',
          entityType: 'ORDER',
          entityId: order._id,
          recipientEmail: customer.email,
          idempotencyKey: `ORDER_SHIPPED:${order._id}`,
          data: {
            customerName: customer.name || (order as any).shippingAddress?.fullName || 'Customer',
            orderNumber: order.orderNumber,
            carrier: shipment.carrier || 'Standard Courier',
            trackingNumber: shipment.awbNumber || 'N/A',
            userId: order.userId,
          },
        });
      }
    } catch (notifErr) {
      console.warn('[Shipment] Failed to dispatch ORDER_SHIPPED notification:', notifErr);
    }

    const fulfillment = await Fulfillment.findOne({ orderId: order._id });
    if (fulfillment) {
      fulfillment.status = FulfillmentStatus.HANDED_OVER;
      fulfillment.handedOverAt = now;
      await fulfillment.save();
    }
  }

  res.status(201).json({ success: true, data: shipment });
});

/**
 * GET /api/admin/orders/:id/shipment/label or /api/shipping/shipments/:awb/label
 * Stream PDF shipping label
 */
export const getShippingLabel = catchAsync(async (req: Request, res: Response) => {
  const idOrAwb = String(req.params.id || req.params.awb || '');

  let shipment = null;
  if (mongoose.Types.ObjectId.isValid(idOrAwb)) {
    shipment = await Shipment.findOne({ orderId: idOrAwb });
    if (!shipment) {
      shipment = await Shipment.findById(idOrAwb);
    }
  }

  if (!shipment) {
    shipment = await Shipment.findOne({ awbNumber: idOrAwb });
  }

  if (!shipment) {
    throw new AppError('Shipment not found', 404);
  }

  // If provider is NimbusPost and has an official carrier PDF URL, fetch and stream the PDF server-side instead of redirecting
  if (shipment.provider === 'nimbuspost') {
    try {
      const provider = logisticsService.getProvider('nimbuspost');
      const labelRes = await provider.generateLabel(shipment.awbNumber);
      if (labelRes?.labelUrl && labelRes.labelUrl.startsWith('http') && !labelRes.labelUrl.includes('/api/admin/orders/')) {
        const remoteRes = await axios.get<ArrayBuffer>(labelRes.labelUrl, {
          responseType: 'arraybuffer',
          timeout: 10000,
          validateStatus: (status) => status === 200,
        });

        const contentType = (remoteRes.headers['content-type'] as string) || '';
        const buffer = Buffer.from(remoteRes.data);
        const isPdf = contentType.toLowerCase().includes('application/pdf') || buffer.subarray(0, 4).toString() === '%PDF';

        if (!isPdf || buffer.length === 0) {
          throw new Error(`Remote response was not a valid PDF (status: ${remoteRes.status}, contentType: ${contentType}, size: ${buffer.length})`);
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="Label-${shipment.awbNumber}.pdf"`);
        res.setHeader('Content-Length', buffer.length);
        return res.end(buffer);
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.warn(
        `[Label] NimbusPost official label fetch failed for orderId=${shipment.orderId}, awb=${shipment.awbNumber}, provider=${shipment.provider}: ${errMsg}. Falling back to local PDF generator.`
      );
    }
  }

  const order = await Order.findById(shipment.orderId);
  if (!order) {
    console.error(
      `[Label] Associated order not found for shipping label: orderId=${shipment.orderId}, awb=${shipment.awbNumber}, provider=${shipment.provider}`
    );
    return res.status(404).json({
      success: false,
      message: 'Associated order not found',
      code: 'ORDER_NOT_FOUND',
    });
  }

  try {
    const pdfBuffer = await generateShippingLabelPDFBuffer(shipment, order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Label-${shipment.awbNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(
      `[Label] Failed to generate local PDF label: orderId=${shipment.orderId}, awb=${shipment.awbNumber}, provider=${shipment.provider}, hasCarrier=${Boolean(shipment.carrier)}, error=${errMsg}`
    );
    return res.status(500).json({
      success: false,
      message: 'Failed to generate shipping label',
      code: 'LABEL_GENERATION_FAILED',
    });
  }
});

/**
 * POST /api/admin/orders/:id/shipment/pickup
 * Request courier pickup for shipment
 */
export const requestPickup = catchAsync(async (req: AuthRequest, res: Response) => {
  const orderId = req.params.id as string;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new AppError('Invalid order ID', 400);
  }

  const shipment = await Shipment.findOne({ orderId });
  if (!shipment) {
    throw new AppError('Shipment not found for this order', 404);
  }

  if (shipment.provider === 'manual') {
    throw new AppError(
      'Pickup scheduling is only available for integrated courier shipments.',
      400,
      'PICKUP_UNSUPPORTED'
    );
  }

  if (['PICKED_UP', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'NDR', 'RTO', 'CANCELLED'].includes(shipment.status)) {
    throw new AppError(
      `Pickup cannot be scheduled for a shipment in ${shipment.status} status.`,
      400,
      'PICKUP_NOT_ALLOWED'
    );
  }

  const pickupDate = parsePickupDate(req.body?.pickupDate);
  const provider = logisticsService.getProvider(shipment.provider);
  const pickupRes = await provider.requestPickup(shipment.awbNumber, pickupDate);

  shipment.pickupId = pickupRes.pickupId;
  shipment.pickupRequestedAt = new Date();
  shipment.status = 'PICKUP_REQUESTED';
  shipment.trackingHistory.push({
    status: 'PICKUP_REQUESTED',
    location: 'Warehouse Dispatch',
    description: `Courier pickup requested for ${pickupDate ? pickupDate.toISOString().slice(0, 10) : 'the next available date'} (Pickup ID: ${pickupRes.pickupId})`,
    timestamp: new Date()
  });
  shipment.updatedBy = req.user!.id as any;
  await shipment.save();

  await AuditLog.create({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: 'ADMIN_SHIPMENT_PICKUP_REQUESTED',
    entityType: 'ORDER',
    entityId: shipment.orderId,
    metadata: { shipmentId: shipment._id, pickupId: pickupRes.pickupId }
  });

  res.status(200).json({ success: true, data: shipment });
});

/**
 * POST /api/admin/orders/:id/shipment/tracking/refresh
 * Manually query provider for tracking updates
 */
export const refreshTracking = catchAsync(async (req: AuthRequest, res: Response) => {
  const orderId = req.params.id as string;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new AppError('Invalid order ID', 400);
  }

  const shipment = await Shipment.findOne({ orderId });
  if (!shipment) {
    throw new AppError('Shipment not found for this order', 404);
  }

  if (shipment.provider === 'manual') {
    throw new AppError(
      'Live tracking is only available for integrated courier shipments.',
      400,
      'TRACKING_UNSUPPORTED'
    );
  }

  const provider = logisticsService.getProvider(shipment.provider);
  const trackingData = await provider.getTracking(shipment.awbNumber);

  // Update tracking events and status
  if (trackingData.history && trackingData.history.length > 0) {
    for (const evt of trackingData.history) {
      const exists = shipment.trackingHistory.some(existing => 
        existing.providerEventId === evt.providerEventId || 
        (existing.status === evt.status && existing.description === evt.description)
      );
      if (!exists) {
        shipment.trackingHistory.push({
          status: evt.status,
          location: evt.location,
          description: evt.description,
          timestamp: new Date(evt.timestamp),
          providerEventId: evt.providerEventId
        });
      }
    }
  }

  if (trackingData.status && shipment.status !== trackingData.status) {
    shipment.status = trackingData.status as any;
    if (trackingData.status === 'DELIVERED') {
      shipment.deliveredAt = shipment.deliveredAt || new Date();
      const order = await Order.findById(shipment.orderId);
      if (order && order.status !== 'DELIVERED') {
        order.status = 'DELIVERED';
        if (!order.deliveredAt) order.deliveredAt = new Date();
        await order.save();

        try {
          const customer = await User.findById(order.userId).select('name email');
          if (customer && customer.email) {
            notificationService.notify({
              eventType: 'ORDER_DELIVERED',
              entityType: 'ORDER',
              entityId: order._id,
              recipientEmail: customer.email,
              idempotencyKey: `ORDER_DELIVERED:${order._id}`,
              data: {
                customerName: customer.name || (order as any).shippingAddress?.fullName || 'Customer',
                orderNumber: order.orderNumber,
                userId: order.userId,
              },
            });
          }
        } catch (notifErr) {
          console.warn('[Shipment] Failed to dispatch ORDER_DELIVERED notification:', notifErr);
        }
      }
    } else if (['PICKED_UP', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(trackingData.status)) {
      shipment.shippedAt = shipment.shippedAt || new Date();
      const order = await Order.findById(shipment.orderId);
      if (order && ['CONFIRMED', 'PROCESSING'].includes(order.status)) {
        order.status = 'SHIPPED';
        await order.save();

        try {
          const customer = await User.findById(order.userId).select('name email');
          if (customer && customer.email) {
            notificationService.notify({
              eventType: 'ORDER_SHIPPED',
              entityType: 'ORDER',
              entityId: order._id,
              recipientEmail: customer.email,
              idempotencyKey: `ORDER_SHIPPED:${order._id}`,
              data: {
                customerName: customer.name || (order as any).shippingAddress?.fullName || 'Customer',
                orderNumber: order.orderNumber,
                carrier: shipment.carrier || 'Standard Courier',
                trackingNumber: shipment.awbNumber || 'N/A',
                userId: order.userId,
              },
            });
          }
        } catch (notifErr) {
          console.warn('[Shipment] Failed to dispatch ORDER_SHIPPED notification:', notifErr);
        }
      }
    }
  }

  shipment.updatedBy = req.user!.id as any;
  await shipment.save();

  res.status(200).json({ success: true, data: shipment });
});

/**
 * POST /api/admin/orders/:id/shipment/cancel
 * Cancel shipment with logistics carrier
 */
export const cancelShipment = catchAsync(async (req: AuthRequest, res: Response) => {
  const orderId = req.params.id as string;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new AppError('Invalid order ID', 400);
  }

  const shipment = await Shipment.findOne({ orderId });
  if (!shipment) {
    throw new AppError('Shipment not found for this order', 404);
  }

  if (['DELIVERED', 'CANCELLED'].includes(shipment.status)) {
    throw new AppError(`Cannot cancel shipment in status ${shipment.status}`, 400);
  }

  if (shipment.provider !== 'manual') {
    const provider = logisticsService.getProvider(shipment.provider);
    await provider.cancelShipment(shipment.providerShipmentId || '', shipment.awbNumber);
  }

  shipment.status = 'CANCELLED';
  shipment.trackingHistory.push({
    status: 'CANCELLED',
    description: 'Shipment cancelled by admin',
    timestamp: new Date()
  });
  shipment.updatedBy = req.user!.id as any;
  await shipment.save();

  await AuditLog.create({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: 'ADMIN_SHIPMENT_CANCELLED',
    entityType: 'ORDER',
    entityId: shipment.orderId,
    metadata: { shipmentId: shipment._id, awbNumber: shipment.awbNumber }
  });

  res.status(200).json({ success: true, data: shipment });
});

/**
 * GET /api/admin/orders/:id/shipment
 */
export const getShipment = catchAsync(async (req: AuthRequest, res: Response) => {
  const orderId = req.params.id as string;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new AppError('Invalid order ID', 400);
  }

  const shipment = await Shipment.findOne({ orderId });
  res.status(200).json({ success: true, data: shipment });
});

/**
 * PATCH /api/admin/orders/:id/shipment
 * Fallback manual update of carrier / status
 */
export const updateShipment = catchAsync(async (req: AuthRequest, res: Response) => {
  const orderId = req.params.id as string;
  const { status, carrier, trackingNumber, trackingUrl } = req.body;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new AppError('Invalid order ID', 400);
  }

  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404);

  const shipment = await Shipment.findOne({ orderId: order._id });
  if (!shipment) throw new AppError('Shipment not found for this order', 404);

  if (carrier) shipment.carrier = carrier.trim();
  if (trackingNumber) {
    shipment.trackingNumber = trackingNumber.trim();
    shipment.awbNumber = trackingNumber.trim();
  }
  if (trackingUrl !== undefined) shipment.trackingUrl = trackingUrl.trim();

  if (status) {
    // Only accept known carrier states; a raw string could otherwise corrupt the
    // enum and break downstream logic (pickups, labels, returns).
    const SHIPMENT_STATUS_WHITELIST = ['PENDING', 'PICKUP_REQUESTED', 'PICKED_UP', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION', 'RETURNED', 'CANCELLED'];
    if (!SHIPMENT_STATUS_WHITELIST.includes(status)) {
      throw new AppError(`Invalid shipment status: ${status}`, 400);
    }
    shipment.status = status;
    shipment.trackingHistory.push({
      status,
      description: `Shipment status updated to ${status} by admin`,
      timestamp: new Date()
    });

    if (status === 'DELIVERED') {
      shipment.deliveredAt = shipment.deliveredAt || new Date();
      if (order.status !== 'DELIVERED') {
        order.status = 'DELIVERED';
        if (!order.deliveredAt) order.deliveredAt = new Date();
        await order.save();

        try {
          const customer = await User.findById(order.userId).select('name email');
          if (customer && customer.email) {
            notificationService.notify({
              eventType: 'ORDER_DELIVERED',
              entityType: 'ORDER',
              entityId: order._id,
              recipientEmail: customer.email,
              idempotencyKey: `ORDER_DELIVERED:${order._id}`,
              data: {
                customerName: customer.name || (order as any).shippingAddress?.fullName || 'Customer',
                orderNumber: order.orderNumber,
                userId: order.userId,
              },
            });
          }
        } catch (notifErr) {
          console.warn('[Shipment] Failed to dispatch ORDER_DELIVERED notification:', notifErr);
        }
      }
    } else if (['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(status)) {
      if (order.status === 'PROCESSING') {
        order.status = 'SHIPPED';
        await order.save();

        try {
          const customer = await User.findById(order.userId).select('name email');
          if (customer && customer.email) {
            notificationService.notify({
              eventType: 'ORDER_SHIPPED',
              entityType: 'ORDER',
              entityId: order._id,
              recipientEmail: customer.email,
              idempotencyKey: `ORDER_SHIPPED:${order._id}`,
              data: {
                customerName: customer.name || (order as any).shippingAddress?.fullName || 'Customer',
                orderNumber: order.orderNumber,
                carrier: shipment.carrier || 'Standard Courier',
                trackingNumber: shipment.awbNumber || 'N/A',
                userId: order.userId,
              },
            });
          }
        } catch (notifErr) {
          console.warn('[Shipment] Failed to dispatch ORDER_SHIPPED notification:', notifErr);
        }
      }
    }
  }

  shipment.updatedBy = req.user!.id as any;
  await shipment.save();

  await AuditLog.create({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: 'ADMIN_SHIPMENT_UPDATED',
    entityType: 'ORDER',
    entityId: order._id,
    metadata: { shipmentId: shipment._id, status: shipment.status }
  });

  res.status(200).json({ success: true, data: shipment });
});
