const Conversation = require("../models/conversation.model");
const ChatMessage = require("../models/chatMessage.model");
const Notification = require("../models/notifications.model");
const User = require("../models/user.model");
const pushService = require("./pushNotification.service");
const socketService = require("./socket.service");

/**
 * Direct chat delivery pipeline
 * ---------------------------------------------------------------------------
 * One code path used by both REST (controllers/chat.controller.js) and the
 * Socket.IO `chat:send` event, so a message sent from either path is persisted,
 * broadcast and notified identically.
 *
 * Order matters. The database write happens first and is the only step allowed
 * to fail the request — real-time delivery and push are best-effort side
 * effects that must never lose a message the user already got a 201 for.
 */

/** Short human-readable preview used in push bodies and list rows. */
const buildPreview = ({ message, message_type }) => {
  if (message && message.trim()) {
    return message.trim().length > 120 ? `${message.trim().slice(0, 117)}...` : message.trim();
  }
  return { image: "Sent you a photo", video: "Sent you a video", audio: "Sent you a voice note" }[message_type] || "Sent an attachment";
};

const displayName = (user) => [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() || "Someone";

/**
 * Ensures both parties exist on the unified user model before a thread is
 * created. Chat is intentionally scoped to unified accounts; the legacy
 * freelancer/employer/supplier records are a separate namespace.
 */
const assertParticipantsExist = async (senderId, receiverId) => {
  const users = await User.find({ _id: { $in: [senderId, receiverId] } }).select("first_name last_name profile_pic active").lean();
  if (users.length < 2) {
    const error = new Error("Both users must exist to start a conversation.");
    error.code = 404;
    throw error;
  }
  const inactive = users.find((u) => u.active === false);
  if (inactive) {
    const error = new Error("One of the users has not completed verification.");
    error.code = 403;
    throw error;
  }
  return users;
};

/**
 * Sends one message and runs the full delivery pipeline.
 *
 * @param {object} params
 * @param {string} params.senderId       - authenticated sender (never from body)
 * @param {string} params.receiverId
 * @param {string} [params.conversationId] - reuse an existing thread
 * @param {string} [params.message]
 * @param {string} [params.message_type]
 * @param {string} [params.media_url]
 * @param {string} [params.media_thumbnail]
 * @param {string} [params.replyTo]
 * @returns {Promise<{message:object, conversation:object, deliveredVia:string[]}>}
 */
const sendMessage = async ({
  senderId,
  receiverId,
  conversationId,
  message = "",
  message_type = "text",
  media_url = "",
  media_thumbnail = "",
  media_name = "",
  media_size = null,
  replyTo = null,
}) => {
  if (!senderId || !receiverId) {
    const error = new Error("senderId and receiverId are required.");
    error.code = 400;
    throw error;
  }
  if (String(senderId) === String(receiverId)) {
    const error = new Error("You cannot message yourself.");
    error.code = 400;
    throw error;
  }
  if (!message?.trim() && !media_url) {
    const error = new Error("Message or attachment required.");
    error.code = 400;
    throw error;
  }

  const [sender, receiver] = await assertParticipantsExist(senderId, receiverId);

  // Resolve or create the thread. An explicit conversationId is honoured so a
  // client replying in a thread always stays in that thread, but it's
  // re-validated against the participants so it can't be used to inject a
  // message into someone else's conversation.
  let conversation;
  if (conversationId) {
    conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      const error = new Error("Conversation not found.");
      error.code = 404;
      throw error;
    }
    const isParticipant = conversation.participants.some((p) => String(p) === String(senderId));
    if (!isParticipant) {
      const error = new Error("You are not a participant in this conversation.");
      error.code = 403;
      throw error;
    }
  } else {
    conversation = await Conversation.getOrCreate(senderId, receiverId);
  }

  // 1. Persist — the only authoritative step.
  const chatMessage = await ChatMessage.create({
    conversation: conversation._id,
    sender: senderId,
    receiver: receiverId,
    message: message.trim(),
    message_type,
    media_url,
    media_thumbnail,
    media_name,
    media_size,
    replyTo,
  });

  const now = new Date();
  const preview = buildPreview({ message: chatMessage.message, message_type: chatMessage.message_type });

  // 2. Bump the thread and the receiver's unread counter. $inc keeps this safe
  //    when two messages land concurrently; writing an absolute count would
  //    lose one of them.
  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        lastMessage: {
          message: preview,
          message_type: chatMessage.message_type,
          sender: senderId,
          createdAt: now,
        },
        lastMessageAt: now,
      },
      $inc: { [`unreadCounts.${receiverId}`]: 1 },
    }
  );

  const payload = {
    message: chatMessage.toObject(),
    conversationId: String(conversation._id),
    sender: {
      _id: sender._id,
      first_name: sender.first_name,
      last_name: sender.last_name,
      profile_pic: sender.profile_pic,
    },
  };

  // 3. Real-time to the receiver, then an echo to the sender's other devices
  //    so a phone and a tablet stay in sync. Both are best-effort.
  const deliveredVia = [];
  if (socketService.emitToUser(receiverId, "chat:new_message", payload)) {
    deliveredVia.push("socket");
  }
  socketService.emitToUser(senderId, "chat:message_sent", payload);

  // 4. In-app notification — always written so the existing notifications
  //    screen shows chat activity even when the user never opens the app.
  let notification = null;
  try {
    const conversationForNotification = await Conversation.findById(conversation._id).select("mutedBy").lean();
    const isMuted = conversationForNotification?.mutedBy.some((id) => String(id) === String(receiverId));

    if (!isMuted) {
      notification = await Notification.create({
        user: receiverId,
        title: displayName(sender),
        message: preview,
        type: "chat",
      });
      socketService.emitToUser(receiverId, "notification:new", notification.toObject());
      deliveredVia.push("in_app");
    }
  } catch (error) {
    console.error("[chat] in-app notification failed:", error.message);
  }

  // 5. FCM push, only when the receiver has no live socket. Pushing to a user
  //    who is already connected shows a duplicate banner on top of the live
  //    in-app notification they are already looking at.
  const receiverIsOnline = socketService.isOnline(receiverId);
  if (!receiverIsOnline) {
    try {
      const result = await pushService.sendToUser(receiverId, {
        title: displayName(sender),
        body: preview,
        data: {
          type: "chat",
          conversationId: String(conversation._id),
          messageId: String(chatMessage._id),
          senderId: String(senderId),
        },
        icon: sender.profile_pic,
        clickAction: `chat_${conversation._id}`,
      });
      if (result.successCount > 0) deliveredVia.push("fcm");
      else if (result.tokenCount === 0) console.log(`[chat] user ${receiverId} has no registered device tokens`);
    } catch (error) {
      console.error("[chat] FCM push failed:", error.message);
    }
  }

  return {
    message: chatMessage,
    conversation,
    deliveredVia,
    receiverOnline: receiverIsOnline,
    notificationId: notification?._id || null,
  };
};

/**
 * Marks every message the receiver hadn't seen as read, resets their unread
 * counter, and tells the sender so their ticks update in real time.
 */
const markConversationRead = async ({ conversationId, readerId }) => {
  const conversation = await Conversation.findById(conversationId).select("participants unreadCounts");
  if (!conversation) {
    const error = new Error("Conversation not found.");
    error.code = 404;
    throw error;
  }

  const isParticipant = conversation.participants.some((p) => String(p) === String(readerId));
  if (!isParticipant) {
    const error = new Error("You are not a participant in this conversation.");
    error.code = 403;
    throw error;
  }

  // The peer is the other participant — derived from the thread, not the body.
  const peerId = conversation.participants.find((p) => String(p) !== String(readerId));

  const result = await ChatMessage.updateMany(
    { conversation: conversationId, receiver: readerId, seen: false },
    { $set: { seen: true, seenAt: new Date() } }
  );

  await Conversation.updateOne({ _id: conversationId }, { $set: { [`unreadCounts.${readerId}`]: 0 } });

  const readCount = result.modifiedCount || 0;
  if (readCount > 0 && peerId) {
    socketService.emitToUser(peerId, "chat:read", {
      conversationId: String(conversationId),
      readerId: String(readerId),
      readCount,
      readAt: new Date().toISOString(),
    });
  }

  return { readCount, peerId };
};

/**
 * Total unread messages and unread conversations for a user, for the chat badge.
 */
const getUnreadSummary = async (userId) => {
  const conversations = await Conversation.find({ participants: userId }).select("unreadCounts").lean();

  let unreadMessages = 0;
  let unreadConversations = 0;
  for (const conversation of conversations) {
    const count = conversation.unreadCounts?.get?.(String(userId)) ?? conversation.unreadCounts?.[String(userId)] ?? 0;
    if (count > 0) {
      unreadMessages += count;
      unreadConversations += 1;
    }
  }

  return { unreadMessages, unreadConversations };
};

module.exports = { sendMessage, markConversationRead, getUnreadSummary, buildPreview, displayName };
