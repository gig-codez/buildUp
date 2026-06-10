/**
 * unified.auth.js
 *
 * Handles:
 *  1. Register  – creates one User document; initialises wallet; sends OTP.
 *  2. Login     – single endpoint; returns token + activeRole.
 *  3. Switch role (PATCH /auth/switch-role) – changes activeRole.
 *  4. Add role  (POST  /auth/add-role)      – enables an additional role.
 */

const userModel   = require("../models/user.model");
const walletModel = require("../models/wallet.model");
const bcrypt      = require("bcrypt");
const jwt         = require("jsonwebtoken");
const crypto      = require("crypto");
require("dotenv").config();

// ─── helpers ──────────────────────────────────────────────────────────────────

const SALT_ROUNDS = 12;

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.SECRET_KEY, { expiresIn: "24h" });
}

/** Build the standard login response object */
function buildLoginResponse(user, token) {
  return {
    token,
    userId:     user._id,
    first_name: user.first_name,
    last_name:  user.last_name,
    email:      user.email,
    role:       user.activeRole,   // ← what the Flutter app reads as "role"
    roles:      user.roles,        // ← all available roles
    activeRole: user.activeRole,
    userData:   user,
  };
}

/** Ensure a wallet exists for this user; returns the wallet doc */
async function ensureWallet(userId) {
  let wallet = await walletModel.findOne({ owner_id: userId, owner_type: "user" });
  if (!wallet) {
    wallet = await walletModel.create({ owner_id: userId, owner_type: "user" });
  }
  return wallet;
}

// ─── Controller ───────────────────────────────────────────────────────────────

class UnifiedAuthController {

  // ── REGISTER ─────────────────────────────────────────────────────────────────
  /**
   * POST /auth/register
   * Body (common):
   *   first_name, last_name, email, password, tel_num, country, gender, initialRole
   * Body (contractor extras):
   *   profession, NIN_NUM, address
   * Body (supplier extras):
   *   business_name, about_business, TIN, supplier_type
   * Body (client extras):
   *   – none required at registration –
   */
  static async register(req, res) {
    try {
      const {
        first_name, last_name, email, password, tel_num,
        country, gender, address, initialRole,
        // contractor
        profession, NIN_NUM,
        // supplier
        business_name, about_business, TIN, supplier_type,
      } = req.body;

      if (!first_name || !last_name || !email || !password || !tel_num || !initialRole) {
        return res.status(400).json({ message: "Missing required fields." });
      }

      const validRoles = ["contractor", "client", "supplier"];
      if (!validRoles.includes(initialRole)) {
        return res.status(400).json({ message: "Invalid initialRole. Must be contractor, client, or supplier." });
      }

      // Check uniqueness
      const existing = await userModel.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists." });
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // Build role-specific profile sub-document
      let contractorProfile = null;
      let clientProfile     = null;
      let supplierProfile   = null;

      if (initialRole === "contractor") {
        if (!profession) {
          return res.status(400).json({ message: "profession is required for contractor registration." });
        }
        contractorProfile = { profession, NIN_NUM: NIN_NUM || "" };
      }

      if (initialRole === "supplier") {
        if (!business_name || !TIN || !supplier_type) {
          return res.status(400).json({ message: "business_name, TIN, and supplier_type are required for supplier registration." });
        }
        supplierProfile = { business_name, about_business: about_business || "", TIN, supplier_type };
      }

      if (initialRole === "client") {
        clientProfile = {};
      }

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpToken = crypto.randomBytes(16).toString("hex");

      const user = await userModel.create({
        first_name,
        last_name,
        email:    email.toLowerCase(),
        password: hashedPassword,
        tel_num:  String(tel_num),
        country:  country || "",
        gender:   gender  || "Male",
        address:  address || "",
        roles:       [initialRole],
        activeRole:   initialRole,
        contractorProfile,
        clientProfile,
        supplierProfile,
        otp,
        otpToken,
        active:        false,
        emailVerified: false,
      });

      // Auto-create wallet
      await ensureWallet(user._id);

      return res.status(201).json({
        message: "Account created successfully. Please verify your phone number.",
        userId: user._id,
        // In production send OTP via SMS; for dev return it directly
        otp_dev: process.env.NODE_ENV !== "production" ? otp : undefined,
      });
    } catch (error) {
      console.error("[register]", error);
      return res.status(500).json({ message: error.message });
    }
  }

  // ── LOGIN ─────────────────────────────────────────────────────────────────────
  /**
   * POST /auth/login
   * Body: { email, password }
   *
   * Falls back to legacy models (freelancer, employer, supplier) so existing
   * accounts continue to work unchanged.
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
      }

      // ── Try unified user first ───────────────────────────────────────────────
      const user = await userModel.findOne({ email: email.toLowerCase() });
      if (user) {
        if (!user.active || !user.emailVerified) {
          return res.status(401).json({
            message: "Account is not activated. Please verify your email/OTP.",
          });
        }
        const isMatch = bcrypt.compareSync(password, user.password);
        if (!isMatch) {
          return res.status(401).json({ message: "Invalid email or password." });
        }
        const token = signToken(user._id);
        return res.status(200).json(buildLoginResponse(user, token));
      }

      // ── Fall back to legacy models ───────────────────────────────────────────
      // These are kept for backward compatibility with existing accounts.
      // New accounts created via /auth/register use the unified model.

      const freelancerModel = require("../models/freelancer.model");
      const employerModel   = require("../models/employer.model");
      const supplierModel   = require("../models/supplier.model");

      const freelancer = await freelancerModel.findOne({ email, active: true });
      if (freelancer) {
        const isMatch = bcrypt.compareSync(password, freelancer.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid email or password." });
        const token = signToken(freelancer._id);
        // Determine legacy role via role id
        const isConsultant = freelancer.role?.toString() === "6970598f84638dd58abdb551";
        return res.status(200).json({
          token,
          userId:     freelancer._id,
          first_name: `${freelancer.first_name} ${freelancer.last_name}`,
          email:      freelancer.email,
          role:       isConsultant ? "consultant" : "contractor",
          roles:      [isConsultant ? "consultant" : "contractor"],
          activeRole: isConsultant ? "consultant" : "contractor",
          userData:   freelancer,
        });
      }

      const employer = await employerModel.findOne({ email_address: email, emailVerified: true });
      if (employer) {
        if (!employer.active) return res.status(401).json({ message: "Account is not activated." });
        const isMatch = bcrypt.compareSync(password, employer.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid email or password." });
        const token = signToken(employer._id);
        return res.status(200).json({
          token,
          userId:     employer._id,
          first_name: employer.first_name,
          email:      employer.email_address,
          role:       "client",
          roles:      ["client"],
          activeRole: "client",
          userData:   employer,
        });
      }

      const supplier = await supplierModel.findOne({ business_email_address: email });
      if (supplier) {
        if (!supplier.active)        return res.status(401).json({ message: "Account is inactive." });
        if (!supplier.emailVerified) return res.status(401).json({ message: "Please verify your email." });
        const isMatch = bcrypt.compareSync(password, supplier.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid email or password." });
        const token = signToken(supplier._id);
        return res.status(200).json({
          token,
          userId:     supplier._id,
          first_name: supplier.business_name,
          email:      supplier.business_email_address,
          role:       "supplier",
          roles:      ["supplier"],
          activeRole: "supplier",
          userData:   supplier,
        });
      }

      return res.status(401).json({ message: "No account found with this email." });
    } catch (error) {
      console.error("[login]", error);
      return res.status(500).json({ message: error.message });
    }
  }

  // ── SWITCH ACTIVE ROLE ────────────────────────────────────────────────────────
  /**
   * PATCH /auth/switch-role
   * Headers: Authorization: Bearer <token>
   * Body: { role: "contractor" | "client" | "supplier" }
   *
   * Changes the activeRole for the session.  The JWT is re-issued so the
   * Flutter app can refresh its state by calling this endpoint.
   */
  static async switchRole(req, res) {
    try {
      const { role } = req.body;
      const userId   = req.user?.id;    // set by auth middleware

      if (!role) return res.status(400).json({ message: "role is required." });

      const user = await userModel.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found." });

      if (!user.roles.includes(role)) {
        return res.status(403).json({
          message: `You have not activated the '${role}' role on this account.`,
        });
      }

      user.activeRole = role;
      await user.save();

      const token = signToken(user._id);
      return res.status(200).json({
        message: `Switched to ${role} mode.`,
        ...buildLoginResponse(user, token),
      });
    } catch (error) {
      console.error("[switchRole]", error);
      return res.status(500).json({ message: error.message });
    }
  }

  // ── ADD ROLE ──────────────────────────────────────────────────────────────────
  /**
   * POST /auth/add-role
   * Headers: Authorization: Bearer <token>
   * Body: { role, ...role-specific profile fields }
   *
   * Enables an additional role for an existing unified-user account.
   * After adding the role the user can switch to it immediately.
   */
  static async addRole(req, res) {
    try {
      const { role, profession, NIN_NUM, business_name, about_business, TIN, supplier_type } = req.body;
      const userId = req.user?.id;

      if (!role) return res.status(400).json({ message: "role is required." });

      const validRoles = ["contractor", "client", "supplier"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role." });
      }

      const user = await userModel.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found." });

      if (user.roles.includes(role)) {
        return res.status(409).json({ message: `${role} role is already active on your account.` });
      }

      // Validate role-specific required fields
      if (role === "contractor") {
        if (!profession) return res.status(400).json({ message: "profession is required to add contractor role." });
        user.contractorProfile = { profession, NIN_NUM: NIN_NUM || "" };
      }

      if (role === "supplier") {
        if (!business_name || !TIN || !supplier_type) {
          return res.status(400).json({ message: "business_name, TIN, and supplier_type are required to add supplier role." });
        }
        user.supplierProfile = { business_name, about_business: about_business || "", TIN, supplier_type };
      }

      if (role === "client") {
        user.clientProfile = user.clientProfile || {};
      }

      user.addRole(role);
      await user.save();

      return res.status(200).json({
        message: `${role} role added successfully.`,
        roles:      user.roles,
        activeRole: user.activeRole,
      });
    } catch (error) {
      console.error("[addRole]", error);
      return res.status(500).json({ message: error.message });
    }
  }

  // ── GET PROFILE ───────────────────────────────────────────────────────────────
  /**
   * GET /auth/me
   * Returns the current user's profile + roles.
   */
  static async getMe(req, res) {
    try {
      const userId = req.user?.id;
      const user   = await userModel.findById(userId).select("-password -otp -otpToken");
      if (!user) return res.status(404).json({ message: "User not found." });

      // Also fetch wallet summary
      const wallet = await walletModel.findOne({ owner_id: userId, owner_type: "user" });

      return res.status(200).json({
        user,
        wallet: wallet
          ? {
              available_balance: wallet.available_balance,
              pending_balance:   wallet.pending_balance,
              total_earned:      wallet.total_earned,
              total_withdrawn:   wallet.total_withdrawn,
            }
          : null,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ── VERIFY OTP ────────────────────────────────────────────────────────────────
  /**
   * POST /auth/verify-otp
   * Body: { userId, otp }
   * Activates the unified user account.
   */
  static async verifyOtp(req, res) {
    try {
      const { userId, otp } = req.body;
      if (!userId || !otp) return res.status(400).json({ message: "userId and otp are required." });

      const user = await userModel.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found." });

      if (user.otp !== String(otp)) {
        return res.status(400).json({ message: "Invalid OTP." });
      }

      user.active        = true;
      user.emailVerified = true;
      user.otp           = "";
      user.otpToken      = "";
      await user.save();

      return res.status(200).json({ message: "Account verified successfully. You can now log in." });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}

module.exports = UnifiedAuthController;
