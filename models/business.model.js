const { default: mongoose } = require("mongoose");

const businessSchema = mongoose.Schema(
  {
    employer: {
      type: mongoose.Types.ObjectId,
      ref: "employer",
      required: true,
    },
    business_name: {
      type: String,
      required: true,
    },
    business_email: {
      type: String,
      required: true,
    },
    business_tel: {
      type: Number,
      required: true,
    },
    tin_number: {
      type: String,
      required: false,
    },
    address: {
      type: String,
      required: true,
    },
    year_of_foundation: {
      type: String,
      required: false,
    },
    about_business: {
      type: String,
      required: false,
    },
    business_ver_document: {
      type: String,
      required: false,
    },
    otp: {
      type: String,
      default: "",
      required: false,
    },
    otpToken: {
      type: String,
      required: false,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("business", businessSchema);
