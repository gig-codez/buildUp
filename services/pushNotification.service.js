const { messaging } = require("../helpers/firebaseAdmin");
const DeviceToken = require("../models/deviceToken.model");

/**
 * FCM push notification service
 * ---------------------------------------------------------------------------
 * FCM can only target a *device token*, never a user id, so every send starts
 * by resolving the recipient's user id to their current tokens. That mapping
 * lives in models/deviceToken.model.js.
 *
 * Topics are supported for genuine broadcasts ("new job posted"), but direct
 * chat must NOT use them: a topic reaches every subscriber, so it cannot
 * address one specific person.
 */

/**
 * Error codes that mean "this token is permanently dead, stop trying it".
 * Anything else (network blip, quota, 5xx) is treated as transient and the
 * token is kept, because deleting on a transient error would silently strip a
 * user of push notifications.
 */
const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

/**
 * Error codes that mean the *server* is broken, not the device.
 *
 * These deserve loud, specific handling: FCM reports them per-token inside the
 * response array rather than throwing, so they look identical to a dead device
 * unless you check for them. Left unhandled, a revoked service-account key
 * makes every send "fail" while nothing is ever pruned and no notification is
 * ever delivered — push silently dies with only a warning in the log.
 */
const CREDENTIAL_ERROR_CODES = new Set([
  "app/invalid-credential",
  "app/invalid-api-key",
  "authentication/unauthorized",
]);

// Latched once a credential fault is seen so we warn on the first failure
// instead of flooding the log on every message sent.
let credentialFaultReported = false;

const reportCredentialFault = (code, message) => {
  if (credentialFaultReported) return;
  credentialFaultReported = true;
  console.error(
    `\n[FATAL] FCM credential rejected (${code}). No push notification can be delivered.\n` +
      `        Most likely cause: the service account key was revoked or the service\n` +
      `        account was deleted in the Firebase console. Fix by generating a new key:\n` +
      `        Firebase console -> Project build-up-deb9a -> Project settings ->\n` +
      `        Service accounts -> Generate new private key, then replace\n` +
      `        helpers/build-up-deb9a-firebase-adminsdk-*.json\n` +
      `        Original message: ${message}\n`
  );
};

/** True once a credential fault has been observed — surfaced by diagnostics. */
const hasCredentialFault = () => credentialFaultReported;

/** Resets the latch. Only useful in tests. */
const resetCredentialFault = () => {
  credentialFaultReported = false;
};

/**
 * FCM requires every value in `data` to be a string; numbers and booleans
 * throw. ObjectIds in particular are very easy to leak in here, hence the
 * explicit String() coercion.
 */
const serialiseData = (data = {}) =>
  Object.entries(data).reduce(
    (acc, [key, value]) => {
      if (value === undefined || value === null) return acc;
      acc[key] = value instanceof Date ? value.toISOString() : String(value);
      return acc;
    },
    {}
  );

/**
 * Deletes tokens FCM rejected as permanently invalid.
 * Failures are logged, not thrown — a cleanup miss must not fail the send that
 * triggered it, and the unique index will still stop duplicates on re-register.
 */
const pruneDeadTokens = (tokens, response) => {
  // A server-side credential fault fails every token at once and says nothing
  // about the devices, so it must never trigger deletion. Without this guard a
  // revoked key would wipe every registered device in the database.
  const credentialFault = response.responses.some(
    (r) => !r.success && CREDENTIAL_ERROR_CODES.has(r.error?.code)
  );
  if (credentialFault) return;

  const dead = tokens.filter((_, i) => {
    const result = response.responses[i];
    return !result.success && DEAD_TOKEN_CODES.has(result.error?.code);
  });

  if (!dead.length) return;

  DeviceToken.deleteMany({ token: { $in: dead } })
    .then(() => console.log(`[push] pruned ${dead.length} dead device token(s)`))
    .catch((err) => console.error("[push] token cleanup failed:", err.message));
};

/**
 * Sends one push to an explicit list of tokens.
 * Never throws — callers run this alongside a DB write and must not fail
 * because Google had a bad minute.
 *
 * @returns {Promise<{successCount:number, failureCount:number, tokenCount:number}>}
 */
const sendToTokens = async (tokens, { title, body, data, icon, clickAction }) => {
  if (!tokens?.length) return { successCount: 0, failureCount: 0, tokenCount: 0 };

  const notification = {};
  if (title) notification.title = title;
  if (body) notification.body = body;
  if (icon) notification.icon = icon;
  // Android channel + iOS sound. Without these Android silently drops the
  // notification when the app is backgrounded.
  if (clickAction) notification.click_action = clickAction;

  try {
    const response = await messaging().sendEachForMulticast({
      tokens,
      notification,
      data: serialiseData(data),
      android: {
        priority: "high",
        notification: { channel_id: clickAction || "default", ...(icon ? { icon } : {}) },
      },
      apns: {
        headers: { "apns-priority": "10" },
        payload: { aps: { sound: "default", badge: 1, "thread-id": clickAction || "default" } },
      },
    });

    const fault = response.responses.find(
      (r) => !r.success && CREDENTIAL_ERROR_CODES.has(r.error?.code)
    );
    if (fault) {
      reportCredentialFault(fault.error.code, fault.error.message);
      return { successCount: 0, failureCount: tokens.length, tokenCount: tokens.length, credentialFault: true };
    }

    pruneDeadTokens(tokens, response);

    if (response.failureCount > 0) {
      console.warn(`[push] ${response.failureCount}/${tokens.length} token(s) failed`);
    }
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      tokenCount: tokens.length,
    };
  } catch (error) {
    // getMessaging() throws before any network call when the service account is
    // missing or invalid — that is a deploy-time problem worth shouting about.
    const isConfigError = /service account|credential|initialize/i.test(error.message);
    console.error(`[push] send failed${isConfigError ? " (FCM config problem)" : ""}:`, error.message);
    return { successCount: 0, failureCount: tokens.length, tokenCount: tokens.length };
  }
};

/**
 * Primary entry point: push to every device belonging to one user.
 * @param {string} userId
 */
const sendToUser = async (userId, payload) => {
  if (!userId) return { successCount: 0, failureCount: 0, tokenCount: 0 };

  const records = await DeviceToken.find({ user: userId }, { token: 1 }).lean();
  return sendToTokens(records.map((r) => r.token), payload);
};

/**
 * Push to several users at once — fans out to each user's tokens.
 * Users with no registered device simply contribute nothing.
 */
const sendToUsers = async (userIds, payload) => {
  const records = await DeviceToken.find({ user: { $in: userIds } }, { token: 1 }).lean();
  return sendToTokens(records.map((r) => r.token), payload);
};

/**
 * Broadcast to a topic, e.g. "new_jobs". Subscriptions are managed by the
 * device tokens' `topics` field so unsubscribe state is visible in our DB.
 */
const sendToTopic = async (topic, payload) => {
  try {
    const messageId = await messaging().send({
      topic,
      notification: payload.title || payload.body ? { title: payload.title, body: payload.body } : undefined,
      data: serialiseData(payload.data),
    });
    return { successCount: 1, failureCount: 0, tokenCount: null, messageId };
  } catch (error) {
    console.error(`[push] topic "${topic}" send failed:`, error.message);
    return { successCount: 0, failureCount: 1, tokenCount: null };
  }
};

/**
 * Opts one device (or every device of a user when `token` is omitted) into a
 * topic and makes FCM aware of the subscription.
 */
const subscribeToTopic = async ({ token, userId, topic }) => {
  const filter = token ? { token } : { user: userId };
  const records = await DeviceToken.find(filter);

  for (const record of records) {
    try {
      await messaging().subscribeToTopic([record.token], topic);
      if (!record.topics.includes(topic)) {
        record.topics.push(topic);
        await record.save();
      }
    } catch (error) {
      console.error(`[push] subscribe "${topic}" failed:`, error.message);
    }
  }
  return records.length;
};

const unsubscribeFromTopic = async ({ token, userId, topic }) => {
  const filter = token ? { token } : { user: userId };
  const records = await DeviceToken.find(filter);

  for (const record of records) {
    try {
      await messaging().unsubscribeFromTopic([record.token], topic);
      record.topics = record.topics.filter((t) => t !== topic);
      await record.save();
    } catch (error) {
      console.error(`[push] unsubscribe "${topic}" failed:`, error.message);
    }
  }
  return records.length;
};

module.exports = {
  sendToUser,
  sendToUsers,
  sendToTopic,
  sendToTokens,
  subscribeToTopic,
  unsubscribeFromTopic,
  serialiseData,
  hasCredentialFault,
  resetCredentialFault,
};
