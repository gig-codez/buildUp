const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    employer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "employer",
      required: true,
    },
    contractor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "freelancer",
      required: false,
    },
    supplier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "supplier",
      required: false,
    },
    recipient: {
      type: String,
      default: "",
    },
    amount: {
      type: Number,
      required: true,
    },
    phone_number: {
      type: String,
      default: null,
    },
    payment_method: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    reference: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      default: "",
    },
    order: {
      type: Object,
      default: {},
    },
    subscription_plan: {
      type: String,
      default: "",
    },
    subscription_end_date: {
      type: Date,
      required: false,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("payment", paymentSchema);