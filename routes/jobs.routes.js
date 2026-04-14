const express = require("express");
const router = express.Router();
const jobsController = require("../controllers/jobs.controller");
const authMiddleware = require("../middleware/auth.middleware");

// ── JOB CREATION ────────────────────────────────────────────────────────────
router.post("/create-with-escrow", authMiddleware, jobsController.createJobWithEscrow);

// ── JOB FEED (available jobs for contractor, excluding already-applied) ──────
router.get("/contractor/my-jobs", authMiddleware, jobsController.getContractorJobs);

// ── CONTRACTOR ASSIGNED JOBS ─────────────────────────────────────────────────
router.get("/contractor/assigned-jobs", authMiddleware, jobsController.getContractorAssignedJobs);

// ── EMPLOYER JOBS ─────────────────────────────────────────────────────────────
router.get("/employer/my-jobs", authMiddleware, jobsController.getEmployerJobs);

// ── JOB WITH ESCROW DETAILS ───────────────────────────────────────────────────
router.get("/:jobId/with-escrow", authMiddleware, jobsController.getJobWithEscrow);

// ── JOB COMPLETION ────────────────────────────────────────────────────────────
// Contractor marks job as done
router.post("/:jobId/complete", authMiddleware, jobsController.completeJob);
// Employer confirms completion + auto-releases escrow funds to wallet
router.post("/:jobId/confirm-completion", authMiddleware, jobsController.confirmJobCompletion);

// ── APPLICATION MANAGEMENT ────────────────────────────────────────────────────
// Client accepts a contractor's application (hire)
router.post("/applications/:applicationId/accept", authMiddleware, jobsController.acceptApplication);
// Client declines an application
router.post("/applications/:applicationId/decline", authMiddleware, jobsController.declineApplication);

module.exports = router;