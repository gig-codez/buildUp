const express = require("express");
const router = express.Router();
const WalletController = require("../controllers/wallet.controller");

// Get wallet balance summary
router.get("/:owner_type/:owner_id", WalletController.getWallet);

// Get wallet transaction history
router.get("/:owner_type/:owner_id/transactions", WalletController.getWalletTransactions);

// Withdraw to mobile money
router.post("/:owner_type/:owner_id/withdraw", WalletController.withdraw);

// Admin summary
router.get("/admin/summary", WalletController.adminWalletsSummary);

module.exports = router;
