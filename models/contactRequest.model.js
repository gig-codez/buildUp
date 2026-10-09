const mongoose = require("mongoose");

const contactRequestSchema = new mongoose.Schema({
  senderId:      { type: String, required: true },
  senderRole:    { type: String, required: true },
  senderName:    { type: String, required: true },
  recipientId:   { type: String, required: true },
  recipientRole: { type: String, required: true },   // "contractor" | "consultant"
  recipientName: { type: String, required: true },
  subject:       { type: String, default: "Contact Request" },
  message:       { type: String, required: true },
  jobId:         { type: String, default: null },
  status: {
    type: String,
    enum: ["pending", "connected", "rejected"],
    default: "pending",
  },
  adminNote: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("ContactRequest", contactRequestSchema);
