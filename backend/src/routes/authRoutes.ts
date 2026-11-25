import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  me,
  updateProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  googleAuth,
} from "../controllers/authController";
import { requireAuth } from "../middleware/auth";
import { requireTurnstile } from "../middleware/turnstile";
import {
  loginLimiter,
  loginAccountLimiter,
  registerLimiter,
  verifyLimiter,
  verifyAccountLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  refreshLimiter,
  logoutLimiter,
} from "../middleware/rateLimiters";
import { cookieOriginGuard } from "../middleware/cookieOriginGuard";

const router = Router();

router.post("/register", cookieOriginGuard, registerLimiter, requireTurnstile("register"), register);
router.post(
  "/login",
  cookieOriginGuard,
  loginLimiter,
  loginAccountLimiter,
  requireTurnstile("login"),
  login
);
router.post("/refresh", cookieOriginGuard, refreshLimiter, refresh);
router.post("/logout", cookieOriginGuard, logoutLimiter, logout);
router.get("/me", requireAuth, me);
router.patch("/profile", cookieOriginGuard, requireAuth, updateProfile);
router.put("/profile", cookieOriginGuard, requireAuth, updateProfile);
router.post(
  "/forgot-password",
  cookieOriginGuard,
  forgotPasswordLimiter,
  requireTurnstile("forgot_password"),
  forgotPassword
);
router.post(
  "/reset-password",
  cookieOriginGuard,
  resetPasswordLimiter,
  requireTurnstile("reset_password"),
  resetPassword
);
router.post(
  "/verify-email",
  cookieOriginGuard,
  verifyLimiter,
  verifyAccountLimiter,
  requireTurnstile("verify_email", { skipIf: (req) => Boolean(req.body?.token) }),
  verifyEmail
);
router.post(
  "/resend-verification",
  cookieOriginGuard,
  verifyLimiter,
  verifyAccountLimiter,
  requireTurnstile("resend_verification"),
  resendVerification
);
router.post(
  "/google",
  cookieOriginGuard,
  loginLimiter,
  requireTurnstile("google", { skipIf: (req) => Boolean(req.body?.credential) }),
  googleAuth
);

export default router;