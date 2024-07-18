const { default: mongoose } = require("mongoose");
const crypto = require("crypto");
const employerModel = new mongoose.Schema(
  {
    profile_pic: {
      type: String,
      required: false,
      default: "https://via.placeholder.com/100",
    },
    email_address: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    first_name: {
      type: String,
      required: true,
    },
    last_name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: false,
    },
    country: {
      type: String,
      required: false,
    },
    subscription_expired: {
      type: Boolean,
      default: false,
    },
    role: {
      type: mongoose.Types.ObjectId,
      ref: "role",
      required: false,
    },
    balance: {
      type: Number,
      required: false,
      default: 0,
    },
    active: {
      type: Boolean,
      required: false,
      default: false,
    },
    business: { type: mongoose.Types.ObjectId, ref: "business" },
    otp: {
      type: String,
      default: "",
      required: false,
    },
    // otpToken: {
    //   type: String,
    //   required: false,
    //   default: "",
    // },
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

employerModel.methods.createResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000;

  console.log(resetToken, this.passwordResetToken);
  return resetToken;
};

module.exports = mongoose.model("employer", employerModel);
