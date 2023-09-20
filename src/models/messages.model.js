const { default: mongoose } = require("mongoose");
const messagesModel = new mongoose.Schema({
  freelancer: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  employer: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  date_time: {
    type: String,
    required: true,
  },
});
module.exports = mongoose.model("messages", messagesModel);
