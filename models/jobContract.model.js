const { default: mongoose } = require("mongoose");
const jobContractSchema = new mongoose.Schema({
  job_post_id: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  employer_id: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  job_title: {
    type: String,
    required: true,
  },
  job_description: {
    type: Number,
    required: true,
  },
  salary_type: {
    type: String,
    required: true,
  },
  salary_range_max: {
    type: Number,
    required: true,
  },
  salary_range_min: {
    type: Number,
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
  payment_amount: {
    type: Number,
    required: true,
  },
});
module.exports = mongoose.model("jobContract", jobContractSchema);
