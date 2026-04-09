const express = require("express");
const router = express.Router();
const jobsController = require("../controllers/jobs.controller");
const authMiddleware = require("../middleware/auth.middleware");

// ============================================
// JOB CREATION WITH ESCROW
// ============================================

/**
 * POST /api/jobs/create-with-escrow
 * Create a new job with optional escrow protection
 * Body: { job_title, project_fees, escrow_enabled, escrow_type, ... }
 */
router.post(
  "/create-with-escrow",
  authMiddleware,
  jobsController.createJobWithEscrow
);

// ============================================
// JOB ACCEPTANCE - AUTO FETCH CONTRACTOR
// ============================================

/**
 * POST /api/jobs/:jobId/accept
 * Contractor accepts job - contractor ID is auto-fetched and linked to escrow
 */
router.post(
  "/:jobId/accept",
  authMiddleware,
  jobsController.acceptJob
);

// ============================================
// GET JOB WITH ESCROW DETAILS
// ============================================

/**
 * GET /api/jobs/:jobId/with-escrow
 * Get job details including escrow information
 */
router.get(
  "/:jobId/with-escrow",
  authMiddleware,
  jobsController.getJobWithEscrow
);

// ============================================
// JOB COMPLETION
// ============================================

/**
 * POST /api/jobs/:jobId/complete
 * Contractor marks job as completed
 * Body: { completionProof, notes }
 */
router.post(
  "/:jobId/complete",
  authMiddleware,
  jobsController.completeJob
);

/**
 * POST /api/jobs/:jobId/confirm-completion
 * Employer confirms job completion and releases escrow
 */
router.post(
  "/:jobId/confirm-completion",
  authMiddleware,
  jobsController.confirmJobCompletion
);

// ============================================
// GET JOBS
// ============================================

/**
 * GET /api/jobs/employer/my-jobs
 * Get all jobs posted by employer
 * Query: ?status=open&escrowOnly=true&page=1&limit=10
 */
router.get(
  "/employer/my-jobs",
  authMiddleware,
  jobsController.getEmployerJobs
);

/**
 * GET /api/jobs/contractor/my-jobs
 * Get all jobs assigned to contractor
 * Query: ?status=in_progress&escrowOnly=true&page=1&limit=10
 */
router.get(
  "/contractor/my-jobs",
  authMiddleware,
  jobsController.getContractorJobs
);

module.exports = router;