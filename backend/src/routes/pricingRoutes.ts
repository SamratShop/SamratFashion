import { Router } from "express";
import {
  calculatePricing,
  getPublicPricingRule,
  calculatePublicBulkEstimate,
} from "../controllers/pricingController";

const router = Router();

router.post("/calculate", calculatePricing);
router.get("/volume-rules", getPublicPricingRule);
router.post("/volume-estimate", calculatePublicBulkEstimate);

export default router;
