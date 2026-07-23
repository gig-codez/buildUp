const mongoose = require("mongoose");

const adminTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["credit", "withdrawal"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    escrow_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "escrow",
      default: null,
    },
    xyle_reference: {
      type: String,
      default: null,
    },
    phone_number: {
      type: String,
      default: null,
    },
    provider: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "completed",
    },
  },
  { timestamps: true }
);

const adminWalletSchema = new mongoose.Schema(
  {
    // Singleton wallet — only one admin wallet doc needed
    total_fees_earned: {
      type: Number,
      default: 0,
    },
    available_balance: {
      type: Number,
      default: 0,
    },
    total_withdrawn: {
      type: Number,
      default: 0,
    },
    transactions: [adminTransactionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("adminWallet", adminWalletSchema);