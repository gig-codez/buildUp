const { default: mongoose } = require("mongoose");
const crypto = require("crypto");
const supplierModel = new mongoose.Schema(
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
      unique: true
    },
    about_business: {
      type: String,
      required: false,
    },
    type_of_product: {
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
    business_ver_document: {
      type: String,
      required: false,
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
    supplier_deals: [
      {
        type: mongoose.Types.ObjectId,
        ref: "supplierDeal",
        required: true,
      },
    ],
    supplier_type: {
      type: mongoose.Types.ObjectId,
      ref: "supplierType",
      required: true,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetTokenExpires: Date,
  },
  {
    timestamps: true,
  }
);
supplierModel.methods.createResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000;

  console.log(resetToken, this.passwordResetToken);
  return resetToken;
};
module.exports = mongoose.model("supplier", supplierModel);
