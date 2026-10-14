const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

/**
 * Socket.IO real-time layer
 * ---------------------------------------------------------------------------
 * Each authenticated socket is placed in a private room named `user:<id>`.
 * Routing a message is then just `io.to("user:<id>").emit(...)`, which fans out
 * to every device that user has open — phone and tablet both.
 *
 * A user may hold several sockets at once, so presence is a Map of userId to a
 * Set of socket ids, not a single id. Presence is deliberately in-process
 * only: with one server instance this is exact, and if the app scales out it
 * needs the Redis adapter, which socket.io-adapter provides.
 */

let io = null;

// userId -> Set<socketId>
const onlineUsers = new Map();

const roomFor = (userId) => `user:${userId}`;

/**
 * Socket.IO auth handshake.
 *
 * The token may arrive in `auth.token` (the documented Socket.IO way, used by
 * the Flutter and web clients) or in the Authorization header. Same secret as
 * middleware/verifytoken.controller.js so one JWT works for both transports.
 */
const authenticateSocket = (socket, next) => {
  try {
    const bearer = socket.handshake.headers?.authorization;
    const token =
      socket.handshake.auth?.token ||
      (typeof bearer === "string" && bearer.startsWith("Bearer") ? bearer.split(" ")[1] : null);

    if (!token) return next(new Error("UNAUTHORIZED: no token provided"));

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    if (!decoded?.id) return next(new Error("UNAUTHORIZED: malformed token"));

    socket.data.userId = decoded.id;
    socket.data.role = decoded.role;
    return next();
  } catch (error) {
    const reason =
      error.name === "TokenExpiredError" ? "UNAUTHORIZED: token expired" : "UNAUTHORIZED: invalid token";
    return next(new Error(reason));
  }
};

/**
 * Registers a user as online and notifies their other devices.
 * socket.broadcast.to(room) skips the socket that just connected, which is right
 * for presence: the new socket already gets connection:ready, and the only
 * useful recipients are that user's *other* devices.
 */
const addOnline = (socket, userId) => {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socket.id);
  socket.broadcast.to(roomFor(userId)).emit("presence:update", { userId, online: true, devices: onlineUsers.get(userId).size });
};

/**
 * Marks a socket gone. The user only leaves presence once their *last* socket
 * closes — backgrounding one app must not look like going offline.
 */
const removeOnline = (socket, userId) => {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return;

  sockets.delete(socket.id);
  if (sockets.size === 0) {
    onlineUsers.delete(userId);
    socket.broadcast.to(roomFor(userId)).emit("presence:update", { userId, online: false, devices: 0 });
  } else {
    socket.broadcast.to(roomFor(userId)).emit("presence:update", { userId, online: true, devices: sockets.size });
  }
};

/**
 * Typing indicators are relayed but never persisted. The receiver is derived
 * from the conversation's participants rather than trusted from the client, so
 * a caller can't spoof events into someone else's thread.
 */
const handleTyping = async (socket, { conversationId, isTyping }) => {
  if (!conversationId) return;

  try {
    const conversation = await Conversation.findById(conversationId).select("participants").lean();
    const peerId = conversation?.participants.find((id) => String(id) !== String(socket.data.userId));
    if (!peerId) return;

    io.to(roomFor(peerId)).emit("chat:typing", {
      conversationId,
      userId: socket.data.userId,
      isTyping: Boolean(isTyping),
    });
  } catch (error) {
    console.error("[socket] typing relay failed:", error.message);
  }
};

// Required lazily to avoid a circular require at module load.
let Conversation;
const registerModels = () => {
  if (!Conversation) Conversation = require("../models/conversation.model");
};

/**
 * Relays a message from a socket into the same chatService pipeline the REST
 * route uses, so both transports produce identical delivery, notifications and
 * push behaviour. Required lazily: chat.service requires this module.
 */
const handleSend = async (socket, payload) => {
  const { receiverId, conversationId, message, message_type, media_url, media_thumbnail, media_name, media_size, replyTo } = payload;

  const chatService = require("./chat.service");
  const result = await chatService.sendMessage({
    senderId: socket.data.userId,
    receiverId,
    conversationId,
    message,
    message_type,
    media_url,
    media_thumbnail,
    media_name,
    media_size,
    replyTo,
  });

  return {
    messageId: String(result.message._id),
    conversationId: String(result.conversation._id),
    deliveredVia: result.deliveredVia,
    receiverOnline: result.receiverOnline,
  };
};

/**
 * Attaches Socket.IO to the existing HTTP server.
 * @param {import('http').Server} httpServer
 */
const init = (httpServer, { corsOrigin = "*" } = {}) => {
  registerModels();

  io = new Server(httpServer, {
    cors: { origin: corsOrigin, methods: ["GET", "POST"] },
    // Chat clients are mobile apps on flaky networks; a shorter timeout plus
    // client-side reconnect gets them back online before the heartbeat gives up.
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    const userId = socket.data.userId;

    socket.join(roomFor(userId));
    addOnline(socket, userId);

    // Handshake ack so a client can confirm which identity the server accepted.
    socket.emit("connection:ready", { userId, socketId: socket.id, onlineUserCount: onlineUsers.size });

    socket.on("chat:typing", (payload = {}) => {
      handleTyping(socket, payload).catch((err) => console.error("[socket] typing relay failed:", err.message));
    });

    /**
     * Send a message over the socket with an ack.
     *
     * The sender id comes from the verified handshake token, never the payload.
     * The handler is registered as a callback so an async result is acked rather
     * than thrown — an unhandled rejection here would otherwise take down the
     * server and silently kill every user's live chat.
     */
    socket.on("chat:send", (payload = {}, ack) => {
      handleSend(socket, payload)
        .then((result) => typeof ack === "function" && ack({ ok: true, ...result }))
        .catch((error) => {
          console.error("[socket] chat:send failed:", error.message);
          if (typeof ack === "function") {
            ack({ ok: false, status: error.code ?? 500, message: error.message });
          } else {
            // No ack provided — push the failure back over the room so the
            // sender's UI isn't left showing a message that never persisted.
            socket.emit("chat:send_failed", {
              clientMessageId: payload.clientMessageId,
              message: error.message,
            });
          }
        });
    });

    socket.on("disconnect", () => removeOnline(socket, userId));

    socket.on("error", (err) => console.error(`[socket] error for ${userId}:`, err.message));
  });

  console.log(`[socket] Socket.IO ready (cors: ${corsOrigin})`);
  return io;
};

/**
 * Sends an event to every live device of one user.
 *
 * Returns false — not true — when the user has no open socket. That distinction
 * matters: callers use it to decide whether to fall back to FCM push, so
 * returning truthy for an offline user would silently suppress the push and
 * the message would never arrive.
 */
const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return false;
  // Room emit is a no-op with no members, so presence is the honest signal.
  if (!isOnline(userId)) return false;
  io.to(roomFor(userId)).emit(event, payload);
  return true;
};

/** True when the user has at least one connected device. */
const isOnline = (userId) => onlineUsers.has(String(userId));

/** Number of users currently connected — exposed on /health for ops. */
const getPresence = () => ({
  onlineUsers: onlineUsers.size,
  activeSockets: [...onlineUsers.values()].reduce((sum, set) => sum + set.size, 0),
});

/**
 * Exposed for teardown in tests and for a graceful-shutdown path.
 */
const close = () => {
  if (!io) return;
  io.close();
  io = null;
  onlineUsers.clear();
};

module.exports = { init, emitToUser, isOnline, getPresence, roomFor, onlineUsers, close };
