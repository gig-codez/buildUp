const { default: mongoose } = require("mongoose");
const jobPostSchema = new mongoose.Schema({
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
  salary_type: {
    type: String,
    required: true,
  },
  min_salary: {
    type: Number,
    required: false,
  },
  max_salary: {
    type: Number,
    required: false,
  },
  experience: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
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
  service_description: {
    type: String,
    required: true,
  },

  profession: {
    type: mongoose.Types.ObjectId,
    ref: "contractorProfession",
    required: true,
    index: true,
  },
});

module.exports = mongoose.model("jobPost", jobPostSchema);
