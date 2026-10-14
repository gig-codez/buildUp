const adminWalletModel = require("../models/adminWallet.model");
const escrowModel = require("../models/escrow.model");
const Xyle = require("../services/payments/xyle");
const { v4: uuidv4 } = require("uuid");

class AdminRevenueController {

  // ─── HELPER: get or create the singleton admin wallet ─────────────────────
  static async _getWallet() {
    let wallet = await adminWalletModel.findOne();
    if (!wallet) {
      wallet = new adminWalletModel();
      await wallet.save();
    }
    return wallet;
  }

  // ─── CREDIT FEE (called internally when escrow deposit is confirmed) ──────
  // Call this from escrow.controller.js > confirmDeposit after status → active
  static async creditFee(escrowId, feeAmount) {
    const wallet = await AdminRevenueController._getWallet();
    wallet.total_fees_earned += feeAmount;
    wallet.available_balance += feeAmount;
    wallet.transactions.push({
      type: "credit",
      amount: feeAmount,
      description: `Service fee from escrow deposit`,
      escrow_id: escrowId,
      status: "completed",
    });
    await wallet.save();
    return wallet;
  }

  // ─── GET REVENUE STATS ────────────────────────────────────────────────────
  static async getRevenueStats(req, res) {
    try {
      const wallet = await AdminRevenueController._getWallet();

      // Aggregate per-status totals from escrow
      const escrowStats = await escrowModel.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            total_agreed: { $sum: "$agreed_amount" },
            total_fees: { $sum: "$service_fee" },
          },
        },
      ]);

      // Total escrow fees earned (all time, from escrow records)
      const feeAggregate = await escrowModel.aggregate([
        {
          $match: { status: { $in: ["active", "completed", "completion_requested"] } },
        },
        {
          $group: {
            _id: null,
            total_fees_from_escrows: { $sum: "$service_fee" },
            total_escrow_volume: { $sum: "$agreed_amount" },
            count: { $sum: 1 },
          },
        },
      ]);

      const feeData = feeAggregate[0] || {
        total_fees_from_escrows: 0,
        total_escrow_volume: 0,
        count: 0,
      };

      return res.status(200).json({
        wallet: {
          available_balance: wallet.available_balance,
          total_fees_earned: wallet.total_fees_earned,
          total_withdrawn: wallet.total_withdrawn,
        },
        escrow_overview: {
          total_fees_from_active_escrows: feeData.total_fees_from_escrows,
          total_escrow_volume: feeData.total_escrow_volume,
          funded_escrow_count: feeData.count,
        },
        escrowStats,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── GET ALL ESCROW FEES (paginated) ──────────────────────────────────────
  static async getEscrowFees(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 20;
      const skip = (page - 1) * pageSize;
      const statusFilter = req.query.status ? { status: req.query.status } : {};

      const total = await escrowModel.countDocuments(statusFilter);
      const escrows = await escrowModel
        .find(statusFilter)
        .populate("employer_id", "first_name last_name email_address phone")
        .populate("contractor_id", "first_name last_name email tel_num")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize);

      return res.status(200).json({
        totalDocuments: total,
        totalPages: Math.ceil(total / pageSize),
        currentPage: page,
        pageSize,
        escrows,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── GET WALLET TRANSACTIONS ──────────────────────────────────────────────
  static async getWalletTransactions(req, res) {
    try {
      const wallet = await AdminRevenueController._getWallet();
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 20;

      const allTx = wallet.transactions.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      const total = allTx.length;
      const paginated = allTx.slice((page - 1) * pageSize, page * pageSize);

      return res.status(200).json({
        totalDocuments: total,
        totalPages: Math.ceil(total / pageSize),
        currentPage: page,
        pageSize,
        transactions: paginated,
        wallet: {
          available_balance: wallet.available_balance,
          total_fees_earned: wallet.total_fees_earned,
          total_withdrawn: wallet.total_withdrawn,
        },
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── INITIATE ADMIN WITHDRAWAL via Xyle ───────────────────────────────────
  static async initiateWithdrawal(req, res) {
    try {
      const { amount, phone_number, provider } = req.body;

      if (!amount || !phone_number) {
        return res.status(400).json({ message: "Amount and phone number are required." });
      }

      const withdrawAmount = parseFloat(amount);
      if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
        return res.status(400).json({ message: "Invalid withdrawal amount." });
      }

      const wallet = await AdminRevenueController._getWallet();

      if (wallet.available_balance < withdrawAmount) {
        return res.status(400).json({
          message: `Insufficient balance. Available: UGX ${wallet.available_balance.toLocaleString()}`,
        });
      }

      const phone = Xyle.normalizePhone(phone_number);
      const detectedProvider = provider || Xyle.detectProvider(phone);

      // Initiate Xyle payout
      const xyleResult = await Xyle.initiateWithdrawal(phone, withdrawAmount, detectedProvider);
      const reference = xyleResult.reference || xyleResult.id || uuidv4();

      // Deduct balance and record pending withdrawal
      wallet.available_balance -= withdrawAmount;
      wallet.total_withdrawn += withdrawAmount;
      wallet.transactions.push({
        type: "withdrawal",
        amount: withdrawAmount,
        description: `Admin withdrawal to ${phone}`,
        xyle_reference: reference,
        phone_number: phone,
        provider: detectedProvider,
        status: "completed",
      });
      await wallet.save();

      return res.status(200).json({
        message: "Withdrawal initiated successfully.",
        reference,
        amount: withdrawAmount,
        provider: detectedProvider,
        new_balance: wallet.available_balance,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}

module.exports = AdminRevenueController;