const { default: mongoose } = require("mongoose");

const appliedJobs = new mongoose.Schema(
  {
    contractorId: {
      type: mongoose.Types.ObjectId,
      ref: "freelancer",
      required: true,
    },
    clientId: {
      type: mongoose.Types.ObjectId,
      ref: "employer",
      required: true,
    },
    jobId: {
      type: mongoose.Types.ObjectId,
      ref: "jobPost",
      required: true,
    },
    document: {
      type: String,
      default: "",
      required: false,
    },
    notes: {
      type: String,
      default: "",
      required: false,
    },
    // "pending" = applied, awaiting client decision
    // "accepted" = client hired this contractor
    // "declined" = client declined
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate applications from the same contractor to the same job
appliedJobs.index({ contractorId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model("appliedJobs", appliedJobs);