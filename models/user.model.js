const mongoose = require("mongoose");
const crypto = require("crypto");

/**
 * UNIFIED USER MODEL
 * One account, multiple roles (contractor, client, supplier).
 * Role-specific profile data is stored in embedded sub-documents so
 * no separate collection is needed for basic info.  Heavy data (stock,
 * escrows, etc.) still references this model via owner_id.
 *
 * activeRole  – the role the user is currently operating as.
 * roles       – array of roles the user has activated (contractor, client, supplier).
 *
 * Backwards-compatibility: the legacy freelancer / employer / supplier
 * models are left untouched; this model is for new registrations.
 */

// ─── Contractor profile sub-document ─────────────────────────────────────────
const contractorProfileSchema = new mongoose.Schema(
  {
    profession: { type: mongoose.Types.ObjectId, ref: "contractorProfession" },
    NIN_NUM: { type: String, default: "" },
    bio: { type: String, default: "" },
    yearsOfExperience: { type: Number, default: 0 },
    skills: { type: [String], default: [] },
    certifications: { type: [String], default: [] },
    profileCompleted: { type: Boolean, default: false },
  },
  { _id: false }
);

// ─── Client profile sub-document ─────────────────────────────────────────────
const clientProfileSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Types.ObjectId, ref: "business" },
    subscription_expired: { type: Boolean, default: false },
  },
  { _id: false }
);

// ─── Supplier profile sub-document ───────────────────────────────────────────
const supplierProfileSchema = new mongoose.Schema(
  {
    business_name: { type: String, default: "" },
    about_business: { type: String, default: "" },
    TIN: { type: String, default: "" },
    supplier_type: {
      type: mongoose.Types.ObjectId,
      ref: "supplierType",
    },
  },
  { _id: false }
);

// ─── Consultant profile sub-document ─────────────────────────────────────────
const consultantProfileSchema = new mongoose.Schema(
  {
    profession: { type: mongoose.Types.ObjectId, ref: "contractorProfession" },
    NIN_NUM: { type: String, default: "" },
    bio: { type: String, default: "" },
    yearsOfExperience: { type: Number, default: 0 },
    skills: { type: [String], default: [] },
    certifications: { type: [String], default: [] },
    profileCompleted: { type: Boolean, default: false },
  },
  { _id: false }
);

// ─── Main user schema ─────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    // ── Common fields ──────────────────────────────────────────────────────────
    profile_pic: {
      type: String,
      default: "https://via.placeholder.com/100",
    },
    first_name: { type: String, required: true },
    // Not required: business-style accounts (e.g. suppliers migrated from
    // the legacy schema, which only has a business_name) have no last name.
    last_name: { type: String, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    // Not required: some legacy employer/supplier records never captured a
    // phone number, so this can't be guaranteed non-empty on migration.
    tel_num: { type: String, default: "" },
    country: { type: String, default: "" },
    address: { type: String, default: "" },
    gender: { type: String, enum: ["Male", "Female", "Other"], default: "Male" },
    location: { type: String, default: "" },

    // ── Auth / activation ──────────────────────────────────────────────────────
    active: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    otp: { type: String, default: "" },
    otpToken: { type: String, default: "" },

    // ── Multi-role system ──────────────────────────────────────────────────────
    /**
     * The roles this account has activated.
     * A user starts with one role; additional roles can be added later.
     */
    roles: {
      type: [String],
      enum: ["contractor", "client", "supplier", "consultant"],
      default: [],
    },
    /**
     * The role the user is currently acting as.
     * Must be one of the roles in `roles[]`.
     */
    activeRole: {
      type: String,
      enum: ["contractor", "client", "supplier", "consultant"],
      required: true,
    },

    // ── Role-specific profiles ─────────────────────────────────────────────────
    contractorProfile: { type: contractorProfileSchema, default: null },
    clientProfile: { type: clientProfileSchema, default: null },
    supplierProfile: { type: supplierProfileSchema, default: null },
    consultantProfile: { type: consultantProfileSchema, default: null },

    // ── Password reset ─────────────────────────────────────────────────────────
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetTokenExpires: Date,
  },
  { timestamps: true }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
userSchema.methods.createResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

/**
 * Check whether a user has a given role registered.
 */
userSchema.methods.hasRole = function (role) {
  return this.roles.includes(role);
};

/**
 * Add a new role to the account (idempotent).
 * Does NOT change activeRole.
 */
userSchema.methods.addRole = function (role) {
  if (!this.roles.includes(role)) {
    this.roles.push(role);
  }
};

module.exports = mongoose.model("user", userSchema);
