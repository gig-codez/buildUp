const { default: mongoose } = require("mongoose");

const appliedJobs = new mongoose.Schema(
  {
    contractor: {
      type: mongoose.Types.ObjectId,
      ref: "freelancer",
      required: true,
    },
    client: {
      type: mongoose.Types.ObjectId,
      ref: "employer",
      required: true,
    },
    job: {
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
