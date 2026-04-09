const express = require("express");
const router = express.Router();
const EscrowController = require("../controllers/escrow.controller");

// Create a new escrow
router.post("/create", EscrowController.createEscrow);

// Initiate deposit (employer collects via mobile money)
router.post("/deposit/:escrow_id", EscrowController.initiateDeposit);

// Confirm deposit after Xyle confirms payment
router.post("/confirm-deposit/:escrow_id", EscrowController.confirmDeposit);

// Contractor submits completion proof
router.post("/submit-completion/:escrow_id", EscrowController.submitCompletion);

// Employer confirms completion and releases funds
router.post("/confirm-release/:escrow_id", EscrowController.confirmAndRelease);

// Raise a dispute
router.post("/dispute/:escrow_id", EscrowController.disputeEscrow);

// Get escrows for a user
router.get("/user/:user_id/:role", EscrowController.getEscrows);

// Get single escrow
router.get("/:escrow_id", EscrowController.getSingleEscrow);

// Admin routes
router.get("/admin/all", EscrowController.adminGetAllEscrows);
router.post("/admin/resolve/:escrow_id", EscrowController.adminResolveDispute);

module.exports = router;
