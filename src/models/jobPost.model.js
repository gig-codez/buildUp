const { default: mongoose } = require("mongoose");
const jobPostSchema = new mongoose.Schema({
  employer: {
    type: mongoose.Types.ObjectId,
    required: true,
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
    required: true,
  },
  max_salary: {
    type: Number,
    required: true,
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
  //TODO category
});
module.exports = mongoose.model("jobPost", jobPostSchema);
