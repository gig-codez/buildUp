const DeviceToken = require("../models/deviceToken.model");
const pushService = require("../services/pushNotification.service");

/**
 * FCM device-token endpoints.
 *
 * The client SDK generates the token, so the server can only store what it is
 * handed. `user` always comes from the JWT — a token is therefore registered
 * against whoever is logged in, never against an id in the body.
 *
 * This is the user-id -> device-token mapping that pushService.sendToUser
 * resolves at send time. Without this endpoint, push cannot reach anyone.
 */
class PushTokenController {
  /**
   * Registers (or re-registers) a device token for the logged-in user.
   *
   * Upsert rather than insert: FCM rotates a token on app restore and on some
   * reinstalls, and the old row would otherwise linger forever holding a dead
   * token. Re-claiming an existing token also transfers it to the user who just
   * logged in, which is what makes shared-device logins behave correctly.
   */
  static async registerToken(req, res) {
    try {
      const { token, platform = "android", device_name } = req.body;

      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "token is required." });
      }
      if (!["android", "ios", "web"].includes(platform)) {
        return res.status(400).json({ message: "platform must be one of: android, ios, web." });
      }

      const record = await DeviceToken.findOneAndUpdate(
        { token },
        {
          $set: {
            user: req.userid,
            platform,
            device_name: device_name || "",
            lastSeen: new Date(),
          },
          // $setOnInsert keeps topic subscriptions across a token re-claim, so a
          // rotated token doesn't silently drop the user's subscriptions.
          $setOnInsert: { topics: [] },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.status(200).json({
        message: "Device registered for push notifications.",
        device: {
          token: record.token,
          platform: record.platform,
          device_name: record.device_name,
          registeredAt: record.createdAt,
        },
      });
    } catch (error) {
      // 11000 here means a concurrent request inserted the same token first,
      // which is harmless — report success rather than a 500.
      if (error.code === 11000) {
        return res.status(200).json({ message: "Device already registered for push notifications." });
      }
      return res.status(500).json({ message: error.message });
    }
  }

  /**
   * Removes a token — call on logout, or when the client SDK reports the token
   * no longer exists. Scoped to req.userid so one user cannot delete another's
   * device registration.
   */
  static async unregisterToken(req, res) {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ message: "token is required." });

      const result = await DeviceToken.deleteOne({ token, user: req.userid });

      return res.status(200).json({
        message: result.deletedCount ? "Device unregistered." : "Token was not registered to this account.",
        deleted: result.deletedCount > 0,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // GET /chat/push/devices — lets a user see what is currently registered.
  static async listDevices(req, res) {
    try {
      const devices = await DeviceToken.find({ user: req.userid })
        .select("token platform device_name lastSeen topics createdAt")
        .lean();

      return res.status(200).json({ devices, count: devices.length });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  /**
   * Opts every device of the caller into a broadcast topic.
   * Direct chat never uses topics; these are for server-wide announcements
   * such as "new_jobs" or "maintenance".
   */
  static async subscribeTopic(req, res) {
    try {
      const { topic, token } = req.body;
      if (!topic) return res.status(400).json({ message: "topic is required." });

      // A token may only be re-subscribed if it belongs to the caller.
      if (token) {
        const owned = await DeviceToken.exists({ token, user: req.userid });
        if (!owned) return res.status(403).json({ message: "Token does not belong to this account." });
      }

      const count = await pushService.subscribeToTopic({ token, userId: req.userid, topic });
      return res.status(200).json({ message: `Subscribed to "${topic}".`, devices: count });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  static async unsubscribeTopic(req, res) {
    try {
      const { topic, token } = req.body;
      if (!topic) return res.status(400).json({ message: "topic is required." });

      if (token) {
        const owned = await DeviceToken.exists({ token, user: req.userid });
        if (!owned) return res.status(403).json({ message: "Token does not belong to this account." });
      }

      const count = await pushService.unsubscribeFromTopic({ token, userId: req.userid, topic });
      return res.status(200).json({ message: `Unsubscribed from "${topic}".`, devices: count });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  /**
   * POST /chat/push/test — sends a push to the caller only.
   * Verifies the service account, FCM quota and token registration in one shot
   * without waiting for a real conversation to arrive.
   */
  static async sendTestPush(req, res) {
    try {
      const result = await pushService.sendToUser(req.userid, {
        title: "BuildUp",
        body: "Push notifications are working.",
        data: { type: "system", test: "true" },
        clickAction: "default",
      });

      if (result.tokenCount === 0) {
        return res.status(404).json({
          message: "No device tokens registered for this account. Call POST /chat/push/token first.",
          ...result,
        });
      }

      // A credential fault is a server misconfiguration, not a client problem,
      // so it gets a 502 with the remedy instead of a misleading 200.
      if (result.credentialFault) {
        return res.status(502).json({
          message:
            "FCM rejected the server's service account credentials, so no notification was delivered. " +
            "Generate a new private key in the Firebase console for project build-up-deb9a and replace " +
            "helpers/build-up-deb9a-firebase-adminsdk-*.json",
          ...result,
        });
      }

      return res.status(200).json({ message: "Test push dispatched.", ...result });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}

module.exports = PushTokenController;
