const Conversation = require("../models/conversation.model");
const ChatMessage = require("../models/chatMessage.model");
const User = require("../models/user.model");
const chatService = require("../services/chat.service");
const socketService = require("../services/socket.service");
const fileStorageMiddleware = require("../helpers/file_helper");

/**
 * Direct chat REST API (1:1, delivered immediately — no admin in the loop).
 *
 * Identity always comes from the JWT (req.userid). A sender or participant id
 * is never read from the request body, which is what stops a caller from
 * posting as somebody else.
 */
class ChatController {
  /** Chats with other users — backs the "start a new chat" screen. */
  static columns = { _id: 1, first_name: 1, last_name: 1, profile_pic: 1, activeRole: 1 };

  /**
   * The recipient must be excluded from search results, otherwise the user
   * finds themselves in the list and opens a chat that the service then
   * rejects with "You cannot message yourself."
   */
  static buildUserFilter({ userId, search }) {
    return {
      _id: { $ne: userId },
      ...(search
        ? {
            $or: [
              { first_name: { $regex: search, $options: "i" } },
              { last_name: { $regex: search, $options: "i" } },
              { email: { $regex: search, $options: "i" } },
            ],
          }
        : {}),
    };
  }

  static paginateQuery(filter, page, limit) {
    return User.find(filter).select(ChatController.columns).limit(limit).skip((page - 1) * limit);
  }

  // ─── USERS ──────────────────────────────────────────────────────────────────

  // GET /chat/users?page=1&limit=20&search=jo
  // Searchable user list so a client can pick who to start a chat with.
  static async getUsers(req, res) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;
      const search = (req.query.search || "").trim();

      const filter = ChatController.buildUserFilter({ userId: req.userid, search });

      const [users, total] = await Promise.all([
        ChatController.paginateQuery(filter, page, limit).lean(),
        User.find(filter).countDocuments(),
      ]);

      return res.status(200).json({ users, total, page, pages: Math.ceil(total / limit) });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── CONVERSATIONS ──────────────────────────────────────────────────────────

  // POST /chat/conversations  { receiver_id }
  // Idempotent: returns the existing thread if these two have already chatted.
  static async createConversation(req, res) {
    try {
      const { receiver_id } = req.body;
      if (!receiver_id) return res.status(400).json({ message: "receiver_id is required." });

      const conversation = await Conversation.getOrCreate(req.userid, receiver_id);
      const populated = await Conversation.findById(conversation._id)
        .populate("participants", ChatController.columns)
        .populate("lastMessage.sender", ChatController.columns)
        .lean();

      return res.status(200).json({ message: "Conversation ready.", data: populated });
    } catch (error) {
      return res.status(error.code ?? 500).json({ message: error.message });
    }
  }

  // GET /chat/conversations
  // The thread list, newest activity first, with per-thread unread counts.
  static async getConversations(req, res) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const filter = { participants: req.userid };

      const [conversations, total] = await Promise.all([
        Conversation.find(filter)
          .sort({ lastMessageAt: -1 })
          .skip(skip)
          .limit(limit)
          // `participants` is populated wholesale, then filtered down to the
          // other person client-side below — a $elemMatch populate can't express
          // "not me" without also matching my own id.
          .populate("participants", ChatController.columns)
          .populate("lastMessage.sender", ChatController.columns)
          .lean(),
        Conversation.countDocuments(filter),
      ]);

      const threads = conversations.map((conversation) => {
        const other = conversation.participants.find((p) => String(p._id) !== String(req.userid));
        const unread = conversation.unreadCounts?.get?.(String(req.userid)) ?? conversation.unreadCounts?.[String(req.userid)] ?? 0;
        return {
          ...conversation,
          otherUser: other || null,
          unreadCount: unread,
          isMuted: conversation.mutedBy?.some((id) => String(id) === String(req.userid)) || false,
          isPinned: conversation.pinnedBy?.some((id) => String(id) === String(req.userid)) || false,
          otherUserOnline: other ? socketService.isOnline(other._id) : false,
        };
      });

      const summary = await chatService.getUnreadSummary(req.userid);

      return res.status(200).json({ conversations: threads, total, page, pages: Math.ceil(total / limit), ...summary });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // GET /chat/conversations/:conversationId/messages?page=1&limit=30&before=<id>
  // `before` supports infinite scroll without the off-by-one gaps that plain
  // page/limit pagination hits when new messages arrive mid-scroll.
  static async getMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, parseInt(req.query.limit) || 30);
      const skip = (page - 1) * limit;

      const conversation = await Conversation.findById(conversationId).select("participants");
      if (!conversation) return res.status(404).json({ message: "Conversation not found." });

      const isParticipant = conversation.participants.some((p) => String(p) === String(req.userid));
      if (!isParticipant) return res.status(403).json({ message: "You are not a participant in this conversation." });

      const filter = { conversation: conversationId };
      if (req.query.before) {
        const anchor = await ChatMessage.findById(req.query.before).select("_id");
        if (!anchor) return res.status(400).json({ message: "Invalid before cursor." });
        filter._id = { $lt: anchor._id };
      }

      const [messages, total] = await Promise.all([
        ChatMessage.find(filter)
          .sort({ _id: -1 })
          .skip(skip)
          .limit(limit)
          .populate("replyTo", { message: 1, message_type: 1, sender: 1 })
          .lean(),
        ChatMessage.countDocuments({ conversation: conversationId }),
      ]);

      // Query runs newest-first for pagination but the client renders oldest at
      // the top, so flip before responding.
      return res.status(200).json({
        messages: messages.reverse(),
        total,
        page,
        pages: Math.ceil(total / limit),
        hasMore: skip + messages.length < total,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── MESSAGES ───────────────────────────────────────────────────────────────

  // POST /chat/messages  { receiver_id | conversation_id, message, reply_to }
  static async sendMessage(req, res) {
    try {
      const { receiver_id, conversation_id, message, reply_to } = req.body;

      // Accept either a target user or an existing thread — a reply has only the
      // latter, a first message has only the former.
      let receiverId = receiver_id;
      if (!receiverId && conversation_id) {
        const conversation = await Conversation.findById(conversation_id).select("participants");
        if (!conversation) return res.status(404).json({ message: "Conversation not found." });
        receiverId = conversation.participants.find((p) => String(p) !== String(req.userid));
        if (!receiverId) return res.status(400).json({ message: "Could not resolve the recipient for this conversation." });
      }

      const result = await chatService.sendMessage({
        senderId: req.userid,
        receiverId,
        conversationId: conversation_id,
        message,
        message_type: "text",
        replyTo: reply_to || null,
      });

      return res.status(201).json({
        message: "Message sent.",
        data: result.message,
        conversationId: String(result.conversation._id),
        deliveredVia: result.deliveredVia,
        receiverOnline: result.receiverOnline,
      });
    } catch (error) {
      return res.status(error.code ?? 500).json({ message: error.message });
    }
  }

  // POST /chat/messages/file  (multipart) — same body fields, plus `file`
  static async sendMessageWithFile(req, res) {
    try {
      if (!req.file) return res.status(400).json({ message: "File is missing!" });

      const { receiver_id, conversation_id, message, reply_to } = req.body;
      let receiverId = receiver_id;
      if (!receiverId && conversation_id) {
        const conversation = await Conversation.findById(conversation_id).select("participants");
        if (!conversation) return res.status(404).json({ message: "Conversation not found." });
        receiverId = conversation.participants.find((p) => String(p) !== String(req.userid));
        if (!receiverId) return res.status(400).json({ message: "Could not resolve the recipient for this conversation." });
      }
      if (!receiverId) return res.status(400).json({ message: "receiver_id or conversation_id is required." });

      const mediaUrl = await fileStorageMiddleware(req, "chat");
      const mime = req.file.mimetype || "";
      const messageType = mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : mime.startsWith("audio/") ? "audio" : "file";

      const result = await chatService.sendMessage({
        senderId: req.userid,
        receiverId,
        conversationId: conversation_id,
        // Caption stays separate from the filename so an uncaptioned photo
        // previews as "Sent you a photo" rather than as its own filename.
        message: message || "",
        message_type: messageType,
        media_url: mediaUrl,
        media_name: req.file.originalname,
        media_size: req.file.size,
        replyTo: reply_to || null,
      });

      return res.status(201).json({
        message: "Attachment sent.",
        data: result.message,
        conversationId: String(result.conversation._id),
        deliveredVia: result.deliveredVia,
        receiverOnline: result.receiverOnline,
      });
    } catch (error) {
      return res.status(error.code ?? 500).json({ message: error.message });
    }
  }

  // PATCH /chat/conversations/:conversationId/read
  static async markRead(req, res) {
    try {
      const result = await chatService.markConversationRead({
        conversationId: req.params.conversationId,
        readerId: req.userid,
      });
      return res.status(200).json({ message: "Marked as read.", readCount: result.readCount });
    } catch (error) {
      return res.status(error.code ?? 500).json({ message: error.message });
    }
  }

  // DELETE /chat/messages/:messageId — sender may delete their own message.
  static async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      const chatMessage = await ChatMessage.findById(messageId);
      if (!chatMessage) return res.status(404).json({ message: "Message not found." });

      if (String(chatMessage.sender) !== String(req.userid)) {
        return res.status(403).json({ message: "You can only delete your own messages." });
      }

      // Soft delete: content is dropped but the row stays so read receipts and
      // scroll positions in the other person's history don't shift.
      chatMessage.deleted = true;
      chatMessage.message = "";
      chatMessage.media_url = "";
      chatMessage.media_name = "";
      chatMessage.media_size = null;
      await chatMessage.save();

      socketService.emitToUser(chatMessage.receiver, "chat:message_deleted", {
        conversationId: String(chatMessage.conversation),
        messageId: String(chatMessage._id),
        deletedAt: new Date().toISOString(),
      });

      return res.status(200).json({ message: "Message deleted." });
    } catch (error) {
      return res.status(error.code ?? 500).json({ message: error.message });
    }
  }

  // ─── THREAD SETTINGS ────────────────────────────────────────────────────────

  // PATCH /chat/conversations/:conversationId  { muted: bool, pinned: bool }
  // Preferences are per user, so one person's mute never silences the other.
  static async updateConversationSettings(req, res) {
    try {
      const { conversationId } = req.params;
      const { muted, pinned } = req.body;

      const conversation = await Conversation.findById(conversationId).select("participants");
      if (!conversation) return res.status(404).json({ message: "Conversation not found." });

      const isParticipant = conversation.participants.some((p) => String(p) === String(req.userid));
      if (!isParticipant) return res.status(403).json({ message: "You are not a participant in this conversation." });

      const applyToggle = async (field, value) => {
        if (typeof value !== "boolean") return;
        if (value) await Conversation.updateOne({ _id: conversationId }, { $addToSet: { [field]: req.userid } });
        else await Conversation.updateOne({ _id: conversationId }, { $pull: { [field]: req.userid } });
      };

      await Promise.all([applyToggle("mutedBy", muted), applyToggle("pinnedBy", pinned)]);

      return res.status(200).json({ message: "Conversation updated." });
    } catch (error) {
      return res.status(error.code ?? 500).json({ message: error.message });
    }
  }

  // GET /chat/unread — badge counts only, cheap enough to poll.
  static async getUnreadSummary(req, res) {
    try {
      return res.status(200).json(await chatService.getUnreadSummary(req.userid));
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}

module.exports = ChatController;
