import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { PricingService } from "../services/pricingService";
import { AppError } from "../utils/AppError";
import { calculateAuthoritativeBulkPricing, getEffectivePricingRule } from "../services/volumePricingService";

/**
 * POST /api/pricing/calculate
 * Standard server-authoritative item pricing calculator.
 */
export const calculatePricing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, variantId, quantity } = req.body;

    const data = await PricingService.calculateItemPricing({
      productId,
      variantId,
      quantity,
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getPublicPricingRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, catalogItemId } = req.query;
    if (!productId || typeof productId !== "string" || !mongoose.Types.ObjectId.isValid(productId)) {
      return next(new AppError("Valid productId query parameter is required", 400));
    }

    const rule = await getEffectivePricingRule(productId, typeof catalogItemId === "string" ? catalogItemId : undefined);
    res.status(200).json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
};

export const calculatePublicBulkEstimate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, catalogItemId, totalQuantity } = req.body;
    if (!productId || typeof productId !== "string" || !mongoose.Types.ObjectId.isValid(productId)) {
      return next(new AppError("Valid productId is required", 400));
    }

    const qty = Number(totalQuantity);
    if (!Number.isFinite(qty) || qty < 1) {
      return next(new AppError("totalQuantity must be at least 1", 400));
    }

    const estimate = await calculateAuthoritativeBulkPricing({
      productId,
      catalogItemId,
      totalQuantity: qty,
    });

    res.status(200).json({ success: true, data: estimate });
  } catch (error) {
    next(error);
  }
};
