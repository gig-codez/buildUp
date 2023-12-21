const { default: mongoose } = require("mongoose");
const meetingsSchema = new mongoose.Schema({
  meeting_id: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  employer_id: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  job_seeker_id: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  meeting_subject: {
    type: Number,
    required: true,
  },
  meeting_link: {
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
module.exports = mongoose.model("meetings", meetingsSchema);
