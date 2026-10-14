const { default: mongoose } = require("mongoose");

/**
 * DIRECT CHAT MESSAGE MODEL  (delivered immediately, no admin moderation)
 * ---------------------------------------------------------------------------
 * Contrast with message.model.js, which keeps every message at
 * `status: "pending"` until an admin forwards it. Nothing here has a status:
 * once saved, the message is delivered.
 *
 * `sender` / `receiver` are ObjectIds pointing at the unified `user` model so
 * the recipient's profile can be populated for the chat list header.
 */
const chatMessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "conversation",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },

    // Empty for pure attachments, matching message.model.js behaviour.
    message: {
      type: String,
      default: "",
    },
    message_type: {
      type: String,
      enum: ["text", "image", "file", "video", "audio"],
      default: "text",
    },

    // Media support — same field names as message.model.js so clients can
    // reuse their existing rendering.
    media_url: {
      type: String,
      default: "",
    },
    media_thumbnail: {
      type: String,
      default: "",
    },

    /**
     * Original filename of an attachment, kept separate from `message`.
     *
     * message.model.js crams "name, size, url" into `message`; doing that here
     * would make the text preview read "report.pdf" instead of "Sent a file",
     * so the caption and the filename stay distinct fields.
     */
    media_name: {
      type: String,
      default: "",
    },
    media_size: {
      type: Number,
      default: null,
    },

    // Optional thread anchor. Intentionally not `ref: "chatMessage"`-populated
    // by default to keep the paginated history query cheap.
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chatMessage",
      default: null,
    },

    // Read receipts. `seen` answers "has the receiver looked at it"; `seenAt`
    // answers "when", which clients need for double-tick timestamps.
    seen: {
      type: Boolean,
      default: false,
    },
    seenAt: {
      type: Date,
      default: null,
    },

    // Soft delete — the row stays so read-receipt state and thread positions
    // don't shift under the reader.
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// History pagination is always "newest N within one conversation", so the
// compound index must lead with conversation then time.
chatMessageSchema.index({ conversation: 1, createdAt: -1 });

// Backs the "unseen messages from this sender" badge query.
chatMessageSchema.index({ receiver: 1, seen: false });

module.exports = mongoose.model("chatMessage", chatMessageSchema);
