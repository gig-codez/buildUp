/**
 * wallet.controller.js  (updated)
 *
 * Supports three owner_type values:
 *   "user"       – unified user model (new accounts)
 *   "freelancer" – legacy contractor/consultant accounts
 *   "supplier"   – legacy supplier accounts
 *
 * The wallet is shared across all roles for "user" accounts.
 * No matter which role is active, the same wallet is read/written.
 */

const walletModel     = require("../models/wallet.model");
const userModel       = require("../models/user.model");
const freelancerModel = require("../models/freelancer.model");
const supplierModel   = require("../models/supplier.model");
const Xyle            = require("../services/payments/xyle");
const { v4: uuidv4 }  = require("uuid");

const MIN_WITHDRAWAL = 5000; // UGX 5,000

// ─── Resolve user details regardless of owner_type ───────────────────────────
async function resolveUser(owner_type, owner_id) {
  if (owner_type === "user") {
    const u = await userModel.findById(owner_id);
    if (!u) return null;
    return {
      email: u.email,
      name:  `${u.first_name} ${u.last_name}`,
      phone: u.tel_num,
    };
  }
  if (owner_type === "freelancer") {
    const u = await freelancerModel.findById(owner_id);
    if (!u) return null;
    return { email: u.email, name: `${u.first_name} ${u.last_name}`, phone: String(u.tel_num) };
  }
  // supplier
  const u = await supplierModel.findById(owner_id);
  if (!u) return null;
  return { email: u.business_email_address, name: u.business_name, phone: String(u.business_tel) };
}

class WalletController {

  // ─── GET OR CREATE WALLET ────────────────────────────────────────────────────
  static async getWallet(req, res) {
    try {
      const { owner_id, owner_type } = req.params;

      let wallet = await walletModel.findOne({ owner_id, owner_type });
      if (!wallet) {
        wallet = await walletModel.create({ owner_id, owner_type });
      }

      const { transactions, ...walletData } = wallet.toObject();
      return res.status(200).json({ wallet: walletData });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── GET WALLET TRANSACTIONS ─────────────────────────────────────────────────
  static async getWalletTransactions(req, res) {
    try {
      const { owner_id, owner_type } = req.params;
      const page     = parseInt(req.query.page)     || 1;
      const pageSize = parseInt(req.query.pageSize) || 15;

      let wallet = await walletModel.findOne({ owner_id, owner_type });
      if (!wallet) {
        wallet = await walletModel.create({ owner_id, owner_type });
      }

      const allTx = [...wallet.transactions].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      const total     = allTx.length;
      const paginated = allTx.slice((page - 1) * pageSize, page * pageSize);

      return res.status(200).json({
        totalDocuments:    total,
        totalPages:        Math.ceil(total / pageSize),
        currentPage:       page,
        pageSize,
        available_balance: wallet.available_balance,
        pending_balance:   wallet.pending_balance,
        total_earned:      wallet.total_earned,
        total_withdrawn:   wallet.total_withdrawn,
        transactions:      paginated,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── WITHDRAW TO MOBILE MONEY ────────────────────────────────────────────────
  static async withdraw(req, res) {
    try {
      const { owner_id, owner_type } = req.params;
      const { amount, phone_number, provider } = req.body;

      const amt = parseFloat(amount);
      if (isNaN(amt) || amt < MIN_WITHDRAWAL) {
        return res.status(400).json({
          message: `Minimum withdrawal is UGX ${MIN_WITHDRAWAL.toLocaleString()}.`,
        });
      }

      let wallet = await walletModel.findOne({ owner_id, owner_type });
      if (!wallet) return res.status(404).json({ message: "Wallet not found." });

      if (wallet.available_balance < amt) {
        return res.status(400).json({
          message: `Insufficient balance. Available: UGX ${wallet.available_balance.toLocaleString()}.`,
        });
      }

      const userDetails = await resolveUser(owner_type, owner_id);
      const phone       = Xyle.normalizePhone(phone_number || userDetails?.phone || "");
      const detectedProvider = provider || Xyle.detectProvider(phone);

      wallet.available_balance -= amt;
      wallet.total_withdrawn   += amt;
      const txRef = uuidv4();

      wallet.transactions.push({
        type:        "debit",
        amount:      amt,
        description: `Withdrawal to mobile money (${phone})`,
        reference:   txRef,
        status:      "pending",
      });
      await wallet.save();

      let xyleResult;
      try {
        xyleResult = await Xyle.initiateWithdrawal(phone, amt, detectedProvider);
        const tx = wallet.transactions.find((t) => t.reference === txRef);
        if (tx) {
          tx.xyle_reference = xyleResult.reference || xyleResult.transactionId;
          tx.status = "completed";
        }
        await wallet.save();
      } catch (xyleError) {
        wallet.available_balance += amt;
        wallet.total_withdrawn   -= amt;
        const tx = wallet.transactions.find((t) => t.reference === txRef);
        if (tx) tx.status = "failed";
        await wallet.save();
        return res.status(400).json({ message: `Withdrawal failed: ${xyleError.message}` });
      }

      return res.status(200).json({
        message:           "Withdrawal successful.",
        amount:            amt,
        net_amount:        xyleResult.netAmount || amt,
        xyle_reference:    xyleResult.reference || xyleResult.transactionId,
        remaining_balance: wallet.available_balance,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── DEPOSIT FROM MOBILE MONEY ───────────────────────────────────────────────
  static async deposit(req, res) {
    try {
      const { owner_id, owner_type } = req.params;
      const { amount, phone_number, provider } = req.body;

      const amt = parseFloat(amount);
      if (isNaN(amt) || amt < 5000) {
        return res.status(400).json({ message: "Minimum deposit is UGX 5,000." });
      }

      let wallet = await walletModel.findOne({ owner_id, owner_type });
      if (!wallet) {
        wallet = await walletModel.create({ owner_id, owner_type });
      }

      const userDetails = await resolveUser(owner_type, owner_id);
      const phone = Xyle.normalizePhone(phone_number || userDetails?.phone || "");
      const detectedProvider = provider || Xyle.detectProvider(phone);

      const txRef = uuidv4();
      wallet.transactions.push({
        type:        "credit",
        amount:      amt,
        description: `Deposit from mobile money (${phone})`,
        reference:   txRef,
        status:      "pending",
      });

      let xyleResult;
      try {
        xyleResult = await Xyle.initiateDeposit(phone, amt, detectedProvider);
        const tx = wallet.transactions.find((t) => t.reference === txRef);
        if (tx) {
          tx.xyle_reference = xyleResult.reference || xyleResult.transactionId;
          tx.status = "completed";
        }
        wallet.available_balance += amt;
        wallet.total_earned      += amt;
        await wallet.save();
      } catch (xyleError) {
        const tx = wallet.transactions.find((t) => t.reference === txRef);
        if (tx) tx.status = "failed";
        await wallet.save();
        return res.status(400).json({ message: `Deposit failed: ${xyleError.message}` });
      }

      return res.status(200).json({
        message:       "Deposit initiated successfully.",
        amount:        amt,
        xyle_reference: xyleResult.reference || xyleResult.transactionId,
        new_balance:   wallet.available_balance,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── ADMIN: ALL WALLETS SUMMARY ───────────────────────────────────────────────
  static async adminWalletsSummary(req, res) {
    try {
      const wallets = await walletModel.find({}, "-transactions");

      const totalAvailable = wallets.reduce((s, w) => s + w.available_balance, 0);
      const totalEarned    = wallets.reduce((s, w) => s + w.total_earned, 0);
      const totalWithdrawn = wallets.reduce((s, w) => s + w.total_withdrawn, 0);

      return res.status(200).json({ wallets, totalAvailable, totalEarned, totalWithdrawn });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}

module.exports = WalletController;
