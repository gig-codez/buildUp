const taskChatModel = require("../models/taskChat.model");
const escrowModel = require("../models/escrow.model");
const uploaderManager = require("../helpers/uploadManager");

class TaskChatController {

  // ─── GET MESSAGES FOR AN ESCROW ───────────────────────────────────────────────
  static async getMessages(req, res) {
    try {
      const { escrow_id } = req.params;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 30;
      const skip = (page - 1) * pageSize;

      const escrow = await escrowModel.findById(escrow_id);
      if (!escrow) return res.status(404).json({ message: "Escrow not found." });

      const total = await taskChatModel.countDocuments({ escrow_id });
      const messages = await taskChatModel.find({ escrow_id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize);

      return res.status(200).json({
        totalDocuments: total,
        totalPages: Math.ceil(total / pageSize),
        currentPage: page,
        messages: messages.reverse(),
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── SEND A MESSAGE ───────────────────────────────────────────────────────────
  static async sendMessage(req, res) {
    try {
      const { escrow_id, sender_id, sender_role, sender_name, message } = req.body;

      if (!escrow_id || !sender_id || !sender_role || !sender_name) {
        return res.status(400).json({ message: "Missing required fields." });
      }
      if (!message && !req.file) {
        return res.status(400).json({ message: "Message or attachment required." });
      }

      const escrow = await escrowModel.findById(escrow_id);
      if (!escrow) return res.status(404).json({ message: "Escrow not found." });

      let attachment_url = null;
      let attachment_type = null;

      if (req.file) {
        attachment_url = req.file.location || req.file.path;
        const mime = req.file.mimetype;
        if (mime.startsWith("image/")) attachment_type = "image";
        else if (mime.startsWith("video/")) attachment_type = "video";
        else attachment_type = "document";
      }

      const chatMessage = new taskChatModel({
        escrow_id,
        sender_id,
        sender_role,
        sender_name,
        message: message || "",
        attachment_url,
        attachment_type,
        is_system_message: false,
      });

      await chatMessage.save();
      return res.status(201).json({ message: "Message sent.", data: chatMessage });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── SEND MESSAGE WITH FILE (multipart) ──────────────────────────────────────
  static async sendMessageWithFile(req, res) {
    return TaskChatController.sendMessage(req, res);
  }

  // ─── DELETE MESSAGE ───────────────────────────────────────────────────────────
  static async deleteMessage(req, res) {
    try {
      const { message_id } = req.params;
      const msg = await taskChatModel.findById(message_id);
      if (!msg) return res.status(404).json({ message: "Message not found." });
      if (msg.is_system_message) return res.status(400).json({ message: "Cannot delete system messages." });
      await taskChatModel.findByIdAndDelete(message_id);
      return res.status(200).json({ message: "Message deleted." });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}

module.exports = TaskChatController;
