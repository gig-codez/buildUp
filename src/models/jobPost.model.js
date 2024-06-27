const { default: mongoose } = require("mongoose");
const jobPostSchema = new mongoose.Schema({
  employer: {
    type: mongoose.Types.ObjectId,
    ref: "employer",
    required: true,
    index: true
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
    index: true
  }
});

module.exports = mongoose.model("jobPost", jobPostSchema);
