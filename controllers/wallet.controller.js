const walletModel = require("../models/wallet.model");
const freelancerModel = require("../models/freelancer.model");
const supplierModel = require("../models/supplier.model");
const mailSender = require("../utils/mailSender");
const Xyle = require("../services/payments/xyle");
const { v4: uuidv4 } = require("uuid");

const MIN_WITHDRAWAL = 5000; // UGX 5,000 minimum

class WalletController {

  // ─── GET OR CREATE WALLET ────────────────────────────────────────────────────
  static async getWallet(req, res) {
    try {
      const { owner_id, owner_type } = req.params;

      let wallet = await walletModel.findOne({ owner_id, owner_type });
      if (!wallet) {
        wallet = await new walletModel({ owner_id, owner_type }).save();
      }

      // Return wallet without full transaction history for list view
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
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 15;

      let wallet = await walletModel.findOne({ owner_id, owner_type });
      if (!wallet) {
        wallet = await new walletModel({ owner_id, owner_type }).save();
      }

      // Sort transactions newest-first and paginate
      const allTx = [...wallet.transactions].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      const total = allTx.length;
      const paginated = allTx.slice((page - 1) * pageSize, page * pageSize);

      return res.status(200).json({
        totalDocuments: total,
        totalPages: Math.ceil(total / pageSize),
        currentPage: page,
        pageSize,
        available_balance: wallet.available_balance,
        pending_balance: wallet.pending_balance,
        total_earned: wallet.total_earned,
        total_withdrawn: wallet.total_withdrawn,
        transactions: paginated,
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
          message: `Minimum withdrawal is UGX ${MIN_WITHDRAWAL.toLocaleString()}.`
        });
      }

      let wallet = await walletModel.findOne({ owner_id, owner_type });
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found." });
      }
      if (wallet.available_balance < amt) {
        return res.status(400).json({
          message: `Insufficient wallet balance. Available: UGX ${wallet.available_balance.toLocaleString()}.`
        });
      }

      // Get user details
      let user, email, name;
      if (owner_type === "freelancer") {
        user = await freelancerModel.findById(owner_id);
        email = user?.email;
        name = `${user?.first_name} ${user?.last_name}`;
      } else {
        user = await supplierModel.findById(owner_id);
        email = user?.business_email_address;
        name = user?.business_name;
      }

      const phone = Xyle.normalizePhone(phone_number || (owner_type === "freelancer" ? String(user?.tel_num) : String(user?.business_tel)));
      const detectedProvider = provider || Xyle.detectProvider(phone);

      // Deduct from wallet first
      wallet.available_balance -= amt;
      wallet.total_withdrawn += amt;
      const txRef = uuidv4();

      wallet.transactions.push({
        type: "debit",
        amount: amt,
        description: `Withdrawal to mobile money (${phone})`,
        reference: txRef,
        status: "pending",
      });
      await wallet.save();

      // Initiate Xyle withdrawal
      let xyleResult;
      try {
        xyleResult = await Xyle.initiateWithdrawal(phone, amt, detectedProvider);

        // Update transaction to completed
        const tx = wallet.transactions.find(t => t.reference === txRef);
        if (tx) {
          tx.xyle_reference = xyleResult.reference || xyleResult.transactionId;
          tx.status = "completed";
        }
        await wallet.save();
      } catch (xyleError) {
        // Rollback wallet deduction on failure
        wallet.available_balance += amt;
        wallet.total_withdrawn -= amt;
        const tx = wallet.transactions.find(t => t.reference === txRef);
        if (tx) tx.status = "failed";
        await wallet.save();
        return res.status(400).json({ message: `Withdrawal failed: ${xyleError.message}` });
      }

      // Notify user
      if (email) {
        await mailSender(
          email,
          "Withdrawal Processed",
          `<p>Hi ${name},</p>
           <p>Your withdrawal of <b>UGX ${amt.toLocaleString()}</b> has been sent to ${phone}.</p>
           <p>Reference: ${xyleResult.reference || xyleResult.transactionId}</p>
           <p>Remaining wallet balance: <b>UGX ${wallet.available_balance.toLocaleString()}</b></p>`
        );
      }

      return res.status(200).json({
        message: "Withdrawal successful.",
        amount: amt,
        net_amount: xyleResult.netAmount || amt,
        xyle_reference: xyleResult.reference || xyleResult.transactionId,
        remaining_balance: wallet.available_balance,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── ADMIN: ALL WALLETS SUMMARY ───────────────────────────────────────────────
  static async adminWalletsSummary(req, res) {
    try {
      const wallets = await walletModel.find({}, "-transactions")
        .populate({ path: "owner_id", select: "first_name last_name email business_name business_email_address" });

      const totalAvailable = wallets.reduce((s, w) => s + w.available_balance, 0);
      const totalEarned = wallets.reduce((s, w) => s + w.total_earned, 0);
      const totalWithdrawn = wallets.reduce((s, w) => s + w.total_withdrawn, 0);

      return res.status(200).json({ wallets, totalAvailable, totalEarned, totalWithdrawn });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}

module.exports = WalletController;
