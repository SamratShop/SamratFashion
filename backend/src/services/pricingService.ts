import { Product, ProductStatus } from "../models/Product";
import { AppError } from "../utils/AppError";
import { IPricingSnapshot, ICustomConfiguration } from "../models/Cart";

export interface PricingCalculationRequest {
  productId: string;
  variantId: string;
  quantity: number;
  isCustomized?: boolean;
  customConfigurations?: ICustomConfiguration[];
}

export class PricingService {
  /**
   * Calculates the full pricing snapshot for a single Cart/Order item.
   */
  static async calculateItemPricing(request: PricingCalculationRequest): Promise<IPricingSnapshot> {
    const { productId, variantId, quantity, isCustomized, customConfigurations } = request;

    if (isCustomized || (Array.isArray(customConfigurations) && customConfigurations.length > 0)) {
      throw new AppError("Custom design features are disabled for this deployment", 503, "CUSTOM_DESIGN_DISABLED");
    }

    const product = await Product.findById(productId);
    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new AppError("Product is unavailable or invalid", 400);
    }

    // Canonical currency unit: RUPEES (Razorpay gateway performs paise conversion at boundary)
    const normalizedBasePrice = Math.round(Number(product.basePrice || 0));

    let snapshot: IPricingSnapshot = {
      basePrice: normalizedBasePrice,
      variantPrice: 0,
      fabricPrice: 0,
      printCharges: 0,
      customizationCharges: 0,
      bulkDiscount: 0,
      tax: 0,
      shipping: 0,
      subtotal: 0,
      total: 0,
      currency: "INR",
      calculatedAt: new Date(),
    };

    // Normal Product Calculation
    const parsedQty = Math.floor(Number(quantity));
    if (!Number.isFinite(parsedQty) || parsedQty < 1) {
      throw new AppError("Quantity must be a positive integer", 400);
    }

    const variant = product.variants.find(
      (v) => (v._id && v._id.toString() === variantId?.toString()) || v.sku === variantId?.toString()
    );
    if (!variant || !variant.isAvailable) {
      throw new AppError("Variant is unavailable", 400);
    }

    const normalizedVariantPrice = Math.round(Number(variant.additionalPrice || 0));
    snapshot.variantPrice = normalizedVariantPrice;
    const unitPrice = snapshot.basePrice + snapshot.variantPrice;
    snapshot.subtotal = unitPrice * parsedQty;
    snapshot.shipping = 0;
    snapshot.total = snapshot.subtotal + snapshot.tax;
    return snapshot;
  }
}
