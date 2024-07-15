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
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("appliedJobs", appliedJobs);
