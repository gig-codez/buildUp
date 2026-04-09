const { default: mongoose } = require("mongoose");

const jobPostSchema = new mongoose.Schema(
  {
    employer: {
      type: mongoose.Types.ObjectId,
      ref: "employer",
      required: true,
      index: true,
    },
    job_title: {
      type: String,
      required: true,
    },
    job_description: {
      type: String,
      required: true,
    },
    project_fees: {
      type: Number,
      required: false,
      default: 0,
    },
    experience: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: false,
    },
    contact: {
      type: String,
      required: true,
    },
    application_deadline: {
      type: Date,
      required: true,
    },
    job_duration: {
      type: String,
      required: true,
    },
    is_applied: {
      type: Boolean,
      required: false,
      default: false,
    },
    profession: {
      type: mongoose.Types.ObjectId,
      ref: "contractorProfession",
      required: true,
      index: true,
    },

    // ============================================
    // NEW: ESCROW INTEGRATION FIELDS
    // ============================================

    escrow_enabled: {
      type: Boolean,
      default: false,
      description: "Enable escrow protection for this job",
    },
    escrow_type: {
      type: String,
      enum: ["milestone", "full_payment", "partial_60_40"],
      default: "partial_60_40",
      description: "Type of escrow payment structure",
    },
    escrow_amount: {
      type: Number,
      default: 0,
      description: "Amount to be held in escrow",
    },
    escrow_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "escrow",
      default: null,
      index: true,
      description: "Reference to created escrow account",
    },

    // Contractor assignment
    selected_contractor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "freelancer",
      default: null,
      description: "Contractor selected/assigned for this job",
    },

    // Contract lifecycle
    contract_status: {
      type: String,
      enum: ["open", "in_progress", "completed", "disputed", "cancelled"],
      default: "open",
      description: "Overall contract/job status",
    },

    // Work timeline
    work_start_date: {
      type: Date,
      default: null,
      description: "When work actually starts",
    },
    work_completion_date: {
      type: Date,
      default: null,
      description: "When work is completed",
    },

    // ============================================
    // END: ESCROW INTEGRATION FIELDS
    // ============================================
  },
  { timestamps: true }
);

// Add indexes for better query performance
jobPostSchema.index({ escrow_enabled: 1, contract_status: 1 });
jobPostSchema.index({ selected_contractor_id: 1 });
jobPostSchema.index({ escrow_id: 1 });
jobPostSchema.index({ employer: 1, contract_status: 1 });

module.exports = mongoose.model("jobPost", jobPostSchema);