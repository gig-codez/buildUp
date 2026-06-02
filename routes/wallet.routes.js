const express = require("express");
const router = express.Router();
const WalletController = require("../controllers/wallet.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Get wallet balance summary
router.get("/:owner_type/:owner_id", authMiddleware, WalletController.getWallet);

// Get wallet transaction history
router.get("/:owner_type/:owner_id/transactions", authMiddleware, WalletController.getWalletTransactions);

// Withdraw to mobile money
router.post("/:owner_type/:owner_id/withdraw", authMiddleware, WalletController.withdraw);

// Deposit from mobile money
router.post("/:owner_type/:owner_id/deposit", authMiddleware, WalletController.deposit);

// Admin summary
router.get("/admin/summary", authMiddleware, WalletController.adminWalletsSummary);

module.exports = router;
