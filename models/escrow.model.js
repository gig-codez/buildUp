const mongoose = require("mongoose");

const escrowSchema = new mongoose.Schema(
  {
    employer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "employer",
      required: true,
    },
    contractor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "freelancer",
      required: true,
    },
    job_post_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "jobPost",
      required: false,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    agreed_amount: {
      type: Number,
      required: true,
    },
    // Initial deposit (60% or 100% of agreed_amount)
    initial_deposit: {
      type: Number,
      required: true,
    },
    // Service fee (10%) deducted immediately at deposit
    service_fee: {
      type: Number,
      required: true,
    },
    // Net amount after service fee (what contractor eventually gets)
    net_amount: {
      type: Number,
      required: true,
    },
    // Amount held in escrow (initial_deposit minus service_fee)
    escrow_balance: {
      type: Number,
      default: 0,
    },
    // Amount already released to contractor
    released_amount: {
      type: Number,
      default: 0,
    },
    // Status: pending_deposit | active | completion_requested | completed | disputed | cancelled
    status: {
      type: String,
      enum: ["pending_deposit", "active", "completion_requested", "completed", "disputed", "cancelled"],
      default: "pending_deposit",
    },
    // Xyle payment reference for the initial deposit
    xyle_deposit_reference: {
      type: String,
      default: null,
    },
    // Xyle payment reference for the final release
    xyle_release_reference: {
      type: String,
      default: null,
    },
    // Whether full 100% was paid upfront
    full_payment_upfront: {
      type: Boolean,
      default: false,
    },
    // Completion proof submitted by contractor
    completion_proof: {
      url: { type: String, default: null },
      note: { type: String, default: "" },
      submitted_at: { type: Date, default: null },
    },
    // Employer confirmation of completion
    employer_confirmed: {
      type: Boolean,
      default: false,
    },
    employer_confirmed_at: {
      type: Date,
      default: null,
    },
    // Final release Xyle withdrawal reference
    final_withdrawal_reference: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("escrow", escrowSchema);
