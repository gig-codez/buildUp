const { default: mongoose } = require("mongoose");
const crypto = require("crypto");
const supplierSchema = new mongoose.Schema(
  {
    business_name: {
      type: String,
      required: true,
    },
    profile_pic: {
      type: String,
      required: false,
    },
    business_email_address: {
      type: String,
      required: true,
      unique: true,
    },
    about_business: {
      type: String,
      required: false,
    },
    password: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: false,
    },
    TIN: {
      type: String,
      required: true,
    },
    business_tel: {
      type: String,
      required: true,
    },
    role: {
      type: mongoose.Types.ObjectId,
      ref: "role",
      required: true,
    },
    balance: {
      type: String,
      required: false,
      default: 0,
    },
    supplier_type: {
      type: mongoose.Types.ObjectId,
      ref: "supplierType",
      required: true,
    },
    active: {
      type: Boolean,
      required: false,
      default: true,
    },
    otp: {
      type: Number,
      required: false,
      deafult: 0,
    },
    emailVerified: {
      type: Boolean,
      default: false,
      required: false,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetTokenExpires: Date,
  },

  {
    timestamps: true,
  }
);
supplierSchema.methods.createResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};
// let supplierSchema;
// try {
//   supplierSchema = mongoose.model("supplier");
// } catch (error) {
//   supplierSchema = mongoose.model("supplier", supplierSchema);
// }
module.exports = mongoose.model("supplier", supplierSchema);
