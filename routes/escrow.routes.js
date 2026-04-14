const express = require("express");
const router = express.Router();
const EscrowController = require("../controllers/escrow.controller");
const authMiddleware = require("../middleware/auth.middleware");
const jobsController = require("../controllers/jobs.controller");

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


// buildUp-escrow-dev/routes/escrow.routes.js (additions)

// Create escrow for a job post
router.post("/jobs/:jobId/create-escrow", authMiddleware, jobsController.createJobWithEscrow);

// Get escrow for a specific job
router.get("/jobs/:jobId/escrow", authMiddleware, jobsController.getJobWithEscrow);

// Accept job and auto-fetch contractor ID (links contractor to escrow)
router.post("/jobs/:jobId/accept", authMiddleware, jobsController.applyForJobWithEscrow);

// // Update escrow status when job progress changes
// router.patch("/jobs/:jobId/escrow/status", authMiddleware, jobsController.updateEscrowStatus);

// // Get all escrows for a job post (employer view)
// router.get("/jobs/:jobId/escrows", authMiddleware, jobsController.getEscrowsForJob);

module.exports = router;
