const mongoose = require("mongoose");

const escrowSchema = new mongoose.Schema(
  {
    employer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "employer",
      required: true,
      index: true,
    },
    contractor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "freelancer",
      required: false,
      index: true,
      description: "Contractor ID (auto-fetched on job acceptance)",
    },

    // ============================================
    // NEW: JOB INTEGRATION FIELDS
    // ============================================

    job_post_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "jobPost",
      required: false,
      index: true,
      description: "Associated job post",
    },

    // Job acceptance and work timeline
    job_accepted_at: {
      type: Date,
      default: null,
      description: "When contractor accepted the job",
    },
    work_start_date: {
      type: Date,
      default: null,
      description: "Agreed work start date",
    },
    work_deadline: {
      type: Date,
      default: null,
      description: "Work deadline",
    },
    actual_completion_date: {
      type: Date,
      default: null,
      description: "When work was actually completed",
    },

    // ============================================
    // END: JOB INTEGRATION FIELDS
    // ============================================

    // Core escrow fields
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
      enum: [
        "pending_deposit",
        "active",
        "completion_requested",
        "completed",
        "disputed",
        "cancelled",
      ],
      default: "pending_deposit",
      index: true,
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
    // Xyle payment reference for the remaining balance deposit
    xyle_remaining_reference: {
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

// Composite indexes for common queries
escrowSchema.index({ job_post_id: 1, status: 1 });
escrowSchema.index({ contractor_id: 1, employer_id: 1 });
escrowSchema.index({ status: 1, createdAt: -1 });
escrowSchema.index({ employer_id: 1, status: 1 });

module.exports = mongoose.model("escrow", escrowSchema);