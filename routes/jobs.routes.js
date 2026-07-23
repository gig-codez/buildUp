const express = require("express");
const router = express.Router();
const jobsController = require("../controllers/jobs.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { JOB_CATEGORIES } = require("../constants/categories");

router.get("/categories", (req, res) => res.json({ data: JOB_CATEGORIES }));

// ── JOB CREATION ────────────────────────────────────────────────────────────
router.post("/create-with-escrow", authMiddleware, jobsController.createJobWithEscrow);

// ── JOB EDITING (client edits their own open job post) ───────────────────────
router.patch("/:jobId", authMiddleware, jobsController.updateJob);

// ── JOB FEED (available jobs for contractor, excluding already-applied) ──────
router.get("/contractor/my-jobs", authMiddleware, jobsController.getContractorJobs);

// ── CONTRACTOR ASSIGNED JOBS ─────────────────────────────────────────────────
router.get("/contractor/assigned-jobs", authMiddleware, jobsController.getContractorAssignedJobs);

// ── CONTRACTOR PUBLIC STATS (shown to a client viewing an applicant) ─────────
router.get("/contractor/:contractorId/stats", jobsController.getContractorStats);

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