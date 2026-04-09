const mongoose = require("mongoose");

const taskChatSchema = new mongoose.Schema(
  {
    escrow_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "escrow",
      required: true,
    },
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    sender_role: {
      type: String,
      enum: ["employer", "contractor"],
      required: true,
    },
    sender_name: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      default: "",
    },
    attachment_url: {
      type: String,
      default: null,
    },
    attachment_type: {
      type: String,
      enum: ["image", "document", "video", null],
      default: null,
    },
    // For system messages (deposit confirmed, completion requested, etc.)
    is_system_message: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("taskChat", taskChatSchema);
