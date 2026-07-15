const messageModel = require("../models/message.model");
const { _sendMessage } = require("../global");
const fileStorageMiddleware = require("../helpers/file_helper");

// Special admin WebSocket channel ID — admin dashboard must register with this ID
const ADMIN_CHANNEL_ID = "admin";

class MessageController {
  static columns = { sender_id: 1, receiver_id: 1, message: 1, message_type: 1, time: 1, seen: 1, status: 1, admin_note: 1, media_url: 1, media_thumbnail: 1 };

  // ── Helpers ───────────────────────────────────────────────────────────────

  static paginateMessages(roleUserId, page, limitPerPage) {
    return messageModel
      .find({ $or: [{ sender_id: roleUserId }, { receiver_id: roleUserId }] }, MessageController.columns)
      .limit(limitPerPage)
      .skip((page - 1) * limitPerPage)
      .sort({ _id: 1 });
  }

  static getUserMsgGreaterById(roleUserId, messageId) {
    if (messageId.length === 0) {
      return messageModel
        .find({ $or: [{ sender_id: roleUserId }, { receiver_id: roleUserId }] }, MessageController.columns)
        .sort({ _id: 1 });
    }
    return messageModel
      .find({
        $and: [
          { _id: { $gt: messageId } },
          { $or: [{ sender_id: roleUserId }, { receiver_id: roleUserId }] },
        ],
      }, MessageController.columns)
      .sort({ _id: 1 });
  }

  // ── REST handlers ─────────────────────────────────────────────────────────

  static async getAll(req, res) {
    try {
      const messages = await messageModel.find();
      res.status(200).json({ data: messages });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getUserMsgGreaterByIdReq(req, res) {
    try {
      const { id: messageId, role_user_id: roleUserId } = req.params;
      const messages = await MessageController.getUserMsgGreaterById(roleUserId, messageId);
      res.status(200).json({ data: messages });
    } catch (error) {
      res.status(error.code ?? 500).json({ message: error.message });
    }
  }

  static async getUserMessages(req, res) {
    try {
      const limitPerPage = Number(req.params.limitPerPage);
      const page = Number(req.params.page);
      const roleUserId = req.params.role_user_id;
      const messages = await MessageController.paginateMessages(roleUserId, page, limitPerPage);
      res.status(200).json({ data: messages, paginationDetails: { limitPerPage, page, roleUserId } });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async updateSeen(messageIds) {
    await messageModel.updateMany({ _id: { $in: messageIds } }, { $set: { seen: true } });
  }

  // ── Core: save message (now goes to admin first) ──────────────────────────

  static async saveMessage(obj) {
    if (parseInt(obj.sender_id[0]).toString() !== "NaN" || parseInt(obj.receiver_id[0]).toString() !== "NaN") {
      let error = new Error("Invalid data format for sender_id or receiver_id");
      error.code = 400;
      throw error;
    }

    const messagePayload = new messageModel({
      sender_id:   obj.sender_id,
      receiver_id: obj.receiver_id,
      message:     obj.message,
      message_type: obj.message_type,
      time:        new Date(),
      status:      "pending",         // sits with admin until forwarded
      media_url:   obj.media_url || "",
      media_thumbnail: obj.media_thumbnail || "",
    });

    const newMessage = await messagePayload.save();

    // Notify admin panel via WebSocket (admin registers with userId = "admin")
    _sendMessage(ADMIN_CHANNEL_ID, { type: "newPendingMessage", data: newMessage });

    return {
      message: "Sent successfully. Awaiting admin review.",
      data:    newMessage,
    };
  }

  static async storeMessage(req, res) {
    try {
      const response = await MessageController.saveMessage(req.body);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async storeFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "File is missing!" });
      }
      const docUrl = await fileStorageMiddleware(req, "docs");
      const isImage = req.file.mimetype?.startsWith("image/");
      const isVideo = req.file.mimetype?.startsWith("video/");
      const messageType = isImage ? "image" : isVideo ? "video" : "file";
      const response = await MessageController.saveMessage({
        ...req.body,
        message_type: messageType,
        message: req.file.originalname + ", " + req.file.size + ", " + docUrl,
        media_url: docUrl,
      });
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // ── Admin: list all messages ──────────────────────────────────────────────

  static async getAdminMessages(req, res) {
    try {
      const { status, page = 1, limit = 50 } = req.query;
      const filter = status ? { status } : {};
      const [messages, total] = await Promise.all([
        messageModel.find(filter).sort({ time: -1 }).skip((page - 1) * limit).limit(Number(limit)),
        messageModel.countDocuments(filter),
      ]);
      res.status(200).json({ data: messages, total, page: Number(page), limit: Number(limit) });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // ── Admin: forward message to intended recipient ──────────────────────────

  static async forwardMessage(req, res) {
    try {
      const { id } = req.params;
      const { admin_note = "" } = req.body;

      const msg = await messageModel.findByIdAndUpdate(
        id,
        { status: "forwarded", admin_note, forwarded_at: new Date() },
        { new: true }
      );
      if (!msg) return res.status(404).json({ message: "Message not found." });

      // Deliver to intended receiver now
      _sendMessage(msg.receiver_id, msg);

      // Also notify sender that message was delivered
      _sendMessage(msg.sender_id, { type: "messageForwarded", data: msg });

      res.status(200).json({ message: "Message forwarded.", data: msg });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // ── Admin: reject message ─────────────────────────────────────────────────

  static async rejectMessage(req, res) {
    try {
      const { id } = req.params;
      const { admin_note = "" } = req.body;

      const msg = await messageModel.findByIdAndUpdate(
        id,
        { status: "rejected", admin_note },
        { new: true }
      );
      if (!msg) return res.status(404).json({ message: "Message not found." });

      // Notify sender of rejection
      _sendMessage(msg.sender_id, { type: "messageRejected", data: msg });

      res.status(200).json({ message: "Message rejected.", data: msg });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = MessageController;
