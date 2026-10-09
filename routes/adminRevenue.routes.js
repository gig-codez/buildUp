const express = require("express");
const router = express.Router();
const AdminRevenueController = require("../controllers/adminRevenue.controller");

// Revenue stats summary (for dashboard)
router.get("/stats", AdminRevenueController.getRevenueStats);

// All escrow fee records (paginated, filterable by status)
router.get("/escrow-fees", AdminRevenueController.getEscrowFees);

// Admin wallet transactions
router.get("/transactions", AdminRevenueController.getWalletTransactions);

// Admin initiates a withdrawal of their profit
router.post("/withdraw", AdminRevenueController.initiateWithdrawal);

module.exports = router;