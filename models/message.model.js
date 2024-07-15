const { default: mongoose } = require("mongoose");
// sender and receiver id are roles concatenated with ids i.e if role is client, id will be cli98990...
// other messages apart from text are stored as urls to those objects
const messageModel = new mongoose.Schema({
  sender_id: {
    type: String,
    index: true,
    required: true,
  },
  receiver_id: {
    type: String,
    index: true,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  message_type: {
    type: String,
    enum: ["text", "image", "file", "video", "audio"],
    required: true
  },
  seen:{
    type: Boolean,
    required: true,
    default: false
  },
  time: {
    type: Date,
    required: true,
  },
});
module.exports = mongoose.model("messages", messageModel);
