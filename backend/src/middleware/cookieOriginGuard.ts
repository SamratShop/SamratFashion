import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { isStrictProductionOrStaging } from "../config/env";

// CSRF guard for cookie-authenticated endpoints (N-M4)
// Requires a matching Origin/Referer header and removes localhost from prod allowlist
export const cookieOriginGuard = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const isStrict = isStrictProductionOrStaging();

  if (!origin) {
    if (isStrict) {
      return next(new AppError("Missing origin header on cookie-authenticated request", 403, "FORBIDDEN"));
    }
    if (!referer) {
      return next();
    }
  }

  const candidate = (origin || referer || "").replace(/\/+$/, "").toLowerCase();
  if (!candidate) {
    if (isStrict) {
      return next(new AppError("Invalid origin header", 403, "FORBIDDEN"));
    }
    return next();
  }

  const allowed = [
    (process.env.FRONTEND_URL || "").replace(/\/+$/, "").toLowerCase(),
    ...(isStrict ? [] : ["http://localhost:3000", "http://127.0.0.1:3000"]),
    ...(process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim().replace(/\/+$/, "").toLowerCase())
      : []),
  ].filter(Boolean);

  if (allowed.includes(candidate)) {
    return next();
  }
  return next(new AppError("Cross-origin request blocked", 403, "FORBIDDEN"));
};
