const express = require("express");
const router = express.Router();
const TaskChatController = require("../controllers/taskChat.controller");
const uploaderManager = require("../helpers/uploadManager");

// uploadManager exports a factory function — call it to get the multer instance
const upload = uploaderManager();

// Get messages for an escrow
router.get("/:escrow_id", TaskChatController.getMessages);

// Send text message
router.post("/send", TaskChatController.sendMessage);

// Send message with file attachment
router.post("/send-file", upload.single("file"), TaskChatController.sendMessageWithFile);

// Delete message
router.delete("/:message_id", TaskChatController.deleteMessage);

module.exports = router;
