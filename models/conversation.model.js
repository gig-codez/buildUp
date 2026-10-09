const { default: mongoose } = require("mongoose");

/**
 * DIRECT CONVERSATION MODEL  (1:1 chat, no middle man)
 * ---------------------------------------------------------------------------
 * Deliberately separate from message.model.js / taskChat.model.js, which both
 * hold messages as `pending` until an admin forwards them. This table is for
 * direct user-to-user chat where delivery is immediate and nobody approves it.
 *
 * One row per pair of users. `participants` always holds exactly two ids.
 */
const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "user", required: true }],
      validate: {
        validator: (v) => Array.isArray(v) && v.length === 2,
        message: "A conversation must have exactly 2 participants.",
      },
      index: true,
    },

    /**
     * Stable, order-independent identity for the pair. Sorting the two ids and
     * joining them means user A→B and user B→A resolve to the same string, so
     * the unique index below is what actually prevents duplicate threads.
     * A compound index on `participants` alone cannot do this.
     */
    pairKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Denormalised copy of the newest message so the conversation list renders
    // in one query instead of N joins.
    lastMessage: {
      message: { type: String, default: "" },
      message_type: {
        type: String,
        enum: ["text", "image", "file", "video", "audio"],
        default: "text",
      },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
      createdAt: { type: Date },
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    /**
     * Unread counters, one entry per participant. A Map is used because the
     * keys are user ids we never query on — we only ever read the caller's own
     * entry, so there is no reason to model this as a queryable sub-document.
     * Increments use $inc so two concurrent sends can't clobber each other.
     */
    unreadCounts: {
      type: Map,
      of: Number,
      default: () => new Map(),
    },

    // Per-user chat preferences. Storing the acting user id keeps this
    // symmetric for both sides of the thread.
    mutedBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
      default: [],
    },
    pinnedBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
      default: [],
    },
  },
  { timestamps: true }
);

// Serves the "list my conversations, newest activity first" query.
conversationSchema.index({ lastMessageAt: -1 });

/**
 * Build the canonical pairKey for two user ids. Sorting makes the result
 * independent of argument order.
 */
conversationSchema.statics.buildPairKey = function (idA, idB) {
  return [String(idA), String(idB)].sort().join(":");
};

/**
 * Fetch the shared conversation for two users, creating it if needed.
 * Relies on the unique `pairKey` index to stay race-safe: if two requests
 * arrive at once, one insert wins and the other hits E11000 and we re-read.
 */
conversationSchema.statics.getOrCreate = async function (idA, idB) {
  const participants = [idA, idB];
  const pairKey = this.buildPairKey(idA, idB);

  const existing = await this.findOne({ pairKey });
  if (existing) return existing;

  try {
    return await this.create({
      participants,
      pairKey,
      unreadCounts: { [String(idA)]: 0, [String(idB)]: 0 },
    });
  } catch (error) {
    // Duplicate key = another request created it first.
    if (error.code === 11000) return this.findOne({ pairKey });
    throw error;
  }
};

module.exports = mongoose.model("conversation", conversationSchema);
