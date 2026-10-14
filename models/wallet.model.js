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
    /**
     * owner_id can reference:
     *   - the unified "user" model  (owner_type = "user")
     *   - legacy "freelancer" model (owner_type = "freelancer")   [backward compat]
     *   - legacy "supplier"  model  (owner_type = "supplier")     [backward compat]
     *
     * For every new registration the owner_type should be "user".
     * A single wallet is shared across all three roles.
     */
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    owner_type: {
      type: String,
      enum: ["user", "freelancer", "supplier"],  // "user" = unified model
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

// Unique wallet per owner
walletSchema.index({ owner_id: 1, owner_type: 1 }, { unique: true });

module.exports = mongoose.model("wallet", walletSchema);
