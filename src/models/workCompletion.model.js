const { default: mongoose } = require("mongoose");
const workCompletionSchema = new mongoose.Schema({
  work_completion_id: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  user_id: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  job_contract_id: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  time: {
    type: Number,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  progress_document: {
    type: String,
    required: true,
  },
});
module.exports = mongoose.model("workCompletion", workCompletionSchema);
