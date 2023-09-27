const { default: mongoose } = require("mongoose");
const jobContractSchema = new mongoose.Schema({
  job_contract_id: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  contractee_user_id: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  contractor_user_id: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  payment_amount: {
    type: Number,
    required: true,
  },
  start_date: {
    type: String,
    required: true,
  },
  end_date: {
    type: String,
    required: true,
  },
  service_description: {
    type: String,
    required: true,
  },
  outstanding_details: {
    type: String,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
});
module.exports = mongoose.model("jobContract", jobContractSchema);
