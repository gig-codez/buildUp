const { default: mongoose } = require("mongoose");
const crypto = require("crypto");
const freelancerSchema = new mongoose.Schema(
  {
    profile_pic: {
      type: String,
      default: "https://via.placeholder.com/100",
      required: false,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: "",
      required: false,
    },
    first_name: {
      type: String,
      required: true,
    },
    last_name: {
      type: String,
      required: true,
    },
    tel_num: {
      type: Number,
      required: true,
    },
    country: {
      type: String,
      required: false,
    },
    NIN_NUM: {
      type: String,
      required: false,
    },
    profession: {
      type: mongoose.Types.ObjectId,
      ref: "contractorProfession",
      required: true,
    },
    balance: {
      type: Number,
      required: false,
      default: 0,
    },
    address: {
      type: String,
      required: false,
    },
    gender: { type: String, enum: ["Male", "Female"], required: true },
    role: {
      type: mongoose.Types.ObjectId,
      ref: "role",
      required: true,
    },
    otp: {
      type: String,
      required: false,
      default: "",
    },
    otpToken: {
      type: String,
      required: false,
      default: "",
    },
    active: {
      type: Boolean,
      default: false,
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

freelancerSchema.methods.createResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000;

  console.log(resetToken, this.passwordResetToken);
  return resetToken;
};
module.exports = mongoose.model("freelancer", freelancerSchema);
