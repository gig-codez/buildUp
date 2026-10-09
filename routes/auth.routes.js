/**
 * auth.routes.js  (updated)
 *
 * All authentication endpoints for the unified user model.
 * Legacy role-specific login endpoints are preserved for backward
 * compatibility (existing accounts still use the old models).
 */

const { Router } = require("express");
const router = Router();

const UnifiedAuth  = require("../Auth/unified.auth");
const authMiddleware = require("../middleware/auth.middleware");

// ── Legacy login (kept for backward compat) ──────────────────────────────────
const LoginController = require("../Auth/login");
router.post("/login", LoginController.loginUser);

// ── Unified registration & auth ───────────────────────────────────────────────
/**
 * POST /auth/register
 * Register a new unified account (contractor | client | supplier).
 */
router.post("/register", UnifiedAuth.register);

/**
 * POST /auth/verify-otp
 * Verify OTP for unified accounts.
 */
router.post("/verify-otp", UnifiedAuth.verifyOtp);

// ── Role management (authenticated) ───────────────────────────────────────────
/**
 * PATCH /auth/switch-role
 * Body: { role: "contractor" | "client" | "supplier" }
 * Switch the active role for the current session.
 * A new JWT is returned that reflects the new activeRole.
 */
router.patch("/switch-role", authMiddleware, UnifiedAuth.switchRole);

/**
 * POST /auth/add-role
 * Body: { role, ...role-specific profile fields }
 * Enable an additional role on an existing account.
 */
router.post("/add-role", authMiddleware, UnifiedAuth.addRole);

/**
 * GET /auth/me
 * Return current user profile + wallet summary.
 */
router.get("/me", authMiddleware, UnifiedAuth.getMe);

module.exports = router;
