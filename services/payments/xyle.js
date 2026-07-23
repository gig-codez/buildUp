const fetch = require("node-fetch");
require("dotenv").config();

const XYLE_BASE_URL = process.env.XYLE_ENV === "live"
  ? "https://api.xylepayments.com/api/v1/client"
  : "https://api.xylepayments.com/sandbox/api/v1/client";

const XYLE_API_KEY = process.env.XYLE_API_KEY;

/**
 * Initiate a deposit — pulls money FROM a subscriber's mobile money wallet.
 * They receive a USSD prompt to confirm.
 *
 * @param {string} account  - Phone in international format without +, e.g. 256771234567
 * @param {number} amount   - Amount in UGX
 * @param {string} provider - "MTN_UGANDA" | "AIRTEL_UGANDA"
 */
async function initiateDeposit(account, amount, provider) {
  const res = await fetch(`${XYLE_BASE_URL}/deposit`, {
    method: "POST",
    headers: {
      "x-api-key": XYLE_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ account, amount, provider }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "Xyle deposit failed");
  }
  return data.data; // { id, reference, status, ... }
}

/**
 * Initiate a withdrawal — sends money TO a subscriber's mobile money wallet.
 * Immediately processed.
 *
 * @param {string} account  - Phone in international format without +
 * @param {number} amount   - Amount in UGX
 * @param {string} provider - "MTN_UGANDA" | "AIRTEL_UGANDA"
 */
async function initiateWithdrawal(account, amount, provider) {
  const res = await fetch(`${XYLE_BASE_URL}/withdrawal`, {
    method: "POST",
    headers: {
      "x-api-key": XYLE_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ account, amount, provider }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "Xyle withdrawal failed");
  }
  return data.data; // { transactionId, reference, amount, netAmount, status }
}

/**
 * Check payment status by reference
 * @param {string} ref - Xyle transaction reference
 */
async function checkStatus(ref) {
  const baseStatus = process.env.XYLE_ENV === "live"
    ? "https://api.xylepayments.com/api/v1/client/checkTransactionStatus"
    : "https://api.xylepayments.com/sandbox/api/v1/client/checkTransactionStatus";

  const res = await fetch(`${baseStatus}/${ref}`, {
    headers: { "x-api-key": XYLE_API_KEY },
  });
  const data = await res.json();
  return data; // { transaction_ref, status, amount, ... }
}

/**
 * Get all platform transactions (from Xyle dashboard)
 */
async function getTransactions(page = 1, limit = 10) {
  const res = await fetch(`${XYLE_BASE_URL}/transactions?page=${page}&limit=${limit}`, {
    headers: { "x-api-key": XYLE_API_KEY },
  });
  const data = await res.json();
  return data;
}

/**
 * Detect provider from phone number prefix
 * Uganda: MTN = 077x, 078x; Airtel = 070x, 075x
 */
function detectProvider(phone) {
  const clean = phone.replace(/\D/g, "");
  const local = clean.startsWith("256") ? clean.slice(3) : clean;
  if (local.startsWith("77") || local.startsWith("78") || local.startsWith("39")) {
    return "MTN_UGANDA";
  }
  if (local.startsWith("70") || local.startsWith("75") || local.startsWith("74")) {
    return "AIRTEL_UGANDA";
  }
  return "MTN_UGANDA"; // default fallback
}

/**
 * Normalize phone to international format without +
 * e.g. 0772123456 -> 256772123456
 */
function normalizePhone(phone) {
  const clean = phone.replace(/\D/g, "");
  if (clean.startsWith("256")) return clean;
  if (clean.startsWith("0")) return "256" + clean.slice(1);
  return "256" + clean;
}

module.exports = { initiateDeposit, initiateWithdrawal, checkStatus, getTransactions, detectProvider, normalizePhone };
