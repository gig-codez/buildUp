const { default: mongoose } = require("mongoose");
const messagesModel = new mongoose.Schema({
  message_id: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  sender_id: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  receiver_id: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  message: {
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
module.exports = mongoose.model("messages", messagesModel);
