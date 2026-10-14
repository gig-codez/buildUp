const { Router } = require("express");
const ChatController = require("../controllers/chat.controller");
const PushTokenController = require("../controllers/pushToken.controller");
const authMiddleware = require("../middleware/auth.middleware");
const uploaderManager = require("../helpers/uploadManager");

const router = Router();

// uploadManager exports a factory function — call it to get the multer instance
const upload = uploaderManager();

// Everything under /chat identifies the caller from their JWT, so the whole
// router is gated. Sender ids are never accepted from the body.
router.use(authMiddleware);

// ─── Users (start a new chat) ─────────────────────────────────────────────────
router.get("/users", ChatController.getUsers);

// ─── Conversations ───────────────────────────────────────────────────────────
router.post("/conversations", ChatController.createConversation);
router.get("/conversations", ChatController.getConversations);
router.get("/conversations/:conversationId/messages", ChatController.getMessages);
router.patch("/conversations/:conversationId/read", ChatController.markRead);
router.patch("/conversations/:conversationId", ChatController.updateConversationSettings);

// ─── Messages ────────────────────────────────────────────────────────────────
router.post("/messages", ChatController.sendMessage);
router.post("/messages/file", upload.single("file"), ChatController.sendMessageWithFile);
router.delete("/messages/:messageId", ChatController.deleteMessage);

// ─── Unread badge ────────────────────────────────────────────────────────────
router.get("/unread", ChatController.getUnreadSummary);

// ─── FCM device tokens ───────────────────────────────────────────────────────
router.post("/push/token", PushTokenController.registerToken);
router.delete("/push/token", PushTokenController.unregisterToken);
router.get("/push/devices", PushTokenController.listDevices);
router.post("/push/subscribe", PushTokenController.subscribeTopic);
router.post("/push/unsubscribe", PushTokenController.unsubscribeTopic);
router.post("/push/test", PushTokenController.sendTestPush);

/**
 * Sending over Socket.IO is handled by the socket layer itself (see
 * services/socket.service.js), which runs the same chatService pipeline as the
 * REST route above — there is deliberately no REST endpoint that trusts a
 * socket id for identity.
 */

module.exports = router;
