const { default: mongoose } = require("mongoose");
const jobContractSchema = new mongoose.Schema({
  freelancer: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  employer: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  amount: {
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
  payment_amount: {
    type: Number,
    required: true,
  },
  allowance: {
    type: String,
    required: true,
  },
});
module.exports = mongoose.model("jobContract", jobContractSchema);
