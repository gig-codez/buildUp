const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    employer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "employer",
      required: true,
    },
    recipeint: {
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
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("payment", paymentSchema);
