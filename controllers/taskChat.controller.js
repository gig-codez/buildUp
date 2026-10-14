const taskChatModel = require("../models/taskChat.model");
const escrowModel = require("../models/escrow.model");
const uploaderManager = require("../helpers/uploadManager");

class TaskChatController {

  // ─── GET MESSAGES FOR AN ESCROW ───────────────────────────────────────────────
  // Pending/rejected messages are only visible to their own sender until an
  // admin forwards them — the other party in the chat can't see them by any
  // means (REST or otherwise) until approved. Pass `viewer_id` so we know
  // which side is asking; without it we fall back to the safest view
  // (forwarded + system messages only).
  static async getMessages(req, res) {
    try {
      const { escrow_id } = req.params;
      const { viewer_id } = req.query;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 30;
      const skip = (page - 1) * pageSize;

      const escrow = await escrowModel.findById(escrow_id);
      if (!escrow) return res.status(404).json({ message: "Escrow not found." });

      const visibilityFilter = viewer_id
        ? { $or: [{ status: "forwarded" }, { is_system_message: true }, { sender_id: viewer_id }] }
        : { $or: [{ status: "forwarded" }, { is_system_message: true }] };
      const filter = { escrow_id, ...visibilityFilter };

      const total = await taskChatModel.countDocuments(filter);
      const messages = await taskChatModel.find(filter)
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
        status: "pending", // held for admin review until forwarded
      });

      await chatMessage.save();
      return res.status(201).json({
        message: "Sent successfully. Awaiting admin review.",
        data: chatMessage,
      });
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

  // ─── ADMIN: list escrow chat messages awaiting/reviewed for moderation ───────
  static async getAdminMessages(req, res) {
    try {
      const { status, page = 1, limit = 50 } = req.query;
      const filter = { is_system_message: false, ...(status ? { status } : {}) };
      const [messages, total] = await Promise.all([
        taskChatModel
          .find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(Number(limit))
          .populate({
            path: "escrow_id",
            select: "title employer_id contractor_id",
            populate: [
              { path: "employer_id", select: "first_name last_name" },
              { path: "contractor_id", select: "first_name last_name" },
            ],
          }),
        taskChatModel.countDocuments(filter),
      ]);
      res.status(200).json({ data: messages, total, page: Number(page), limit: Number(limit) });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // ─── ADMIN: forward an escrow chat message to the other party ────────────────
  static async forwardMessage(req, res) {
    try {
      const { id } = req.params;
      const { admin_note = "" } = req.body;

      const msg = await taskChatModel.findByIdAndUpdate(
        id,
        { status: "forwarded", admin_note, forwarded_at: new Date() },
        { new: true }
      );
      if (!msg) return res.status(404).json({ message: "Message not found." });

      res.status(200).json({ message: "Message forwarded.", data: msg });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // ─── ADMIN: reject an escrow chat message ────────────────────────────────────
  static async rejectMessage(req, res) {
    try {
      const { id } = req.params;
      const { admin_note = "" } = req.body;

      const msg = await taskChatModel.findByIdAndUpdate(
        id,
        { status: "rejected", admin_note },
        { new: true }
      );
      if (!msg) return res.status(404).json({ message: "Message not found." });

      res.status(200).json({ message: "Message rejected.", data: msg });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = TaskChatController;
