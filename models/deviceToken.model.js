const { default: mongoose } = require("mongoose");

/**
 * FCM DEVICE TOKEN MODEL
 * ---------------------------------------------------------------------------
 * FCM cannot address a notification by user id — it can only target a device
 * token, the per-installation string the Firebase client SDK registers with.
 * This table is the user-id -> token mapping that lets us send to "this user's
 * devices" instead of "these raw tokens".
 *
 * Kept as its own collection rather than a field on the User schema so that a
 * user can be logged in on a phone and a tablet at once, and so we can garbage
 * collect dead tokens without touching the user document.
 */
const deviceTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },

    // Unique across the whole collection: FCM tokens are globally unique, and
    // this is what stops a reinstall from stacking duplicate rows.
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    platform: {
      type: String,
      enum: ["android", "ios", "web"],
      default: "android",
    },

    // Free-form device label ("Pixel 8", "iPhone 14") shown in a future
    // "manage devices" screen. Never used for routing.
    deviceName: {
      type: String,
      default: "",
    },

    // Bumped on every re-registration. A token that hasn't checked in for a
    // long time is a candidate for pruning.
    lastSeen: {
      type: Date,
      default: Date.now,
    },

    // Topic subscriptions this device opted into (e.g. "new_jobs"). Direct
    // chat is never sent by topic — see pushNotification.service.js.
    topics: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("deviceToken", deviceTokenSchema);
