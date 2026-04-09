const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["credit", "debit"],
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
    reference: {
      type: String,
      default: "",
    },
    escrow_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "escrow",
      default: null,
    },
    // xyle_reference for actual withdrawal payout
    xyle_reference: {
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

const walletSchema = new mongoose.Schema(
  {
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    owner_type: {
      type: String,
      enum: ["freelancer", "supplier"],
      required: true,
    },
    available_balance: {
      type: Number,
      default: 0,
    },
    pending_balance: {
      type: Number,
      default: 0,
    },
    total_earned: {
      type: Number,
      default: 0,
    },
    total_withdrawn: {
      type: Number,
      default: 0,
    },
    transactions: [walletTransactionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("wallet", walletSchema);
