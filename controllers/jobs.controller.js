const JobPost = require("../models/jobPost.model");
const Escrow = require("../models/escrow.model");
const Contractor = require("../models/freelancer.model");
const Employer = require("../models/employer.model");

// ============================================
// CREATE JOB WITH ESCROW
// ============================================
exports.createJobWithEscrow = async (req, res) => {
  try {
    const {
      job_title,
      job_description,
      project_fees,
      experience,
      address,
      contact,
      application_deadline,
      job_duration,
      profession,
      // Escrow fields
      escrow_enabled,
      escrow_type = "partial_60_40",
    } = req.body;

    const employerId = req.userid;

    // Validation
    if (!job_title || !project_fees) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: job_title, project_fees",
      });
    }

    // Calculate escrow amount based on type
    let escrowAmount = project_fees;
    if (escrow_enabled) {
      if (escrow_type === "partial_60_40") {
        escrowAmount = project_fees * 0.6; // 60% upfront
      } else if (escrow_type === "full_payment") {
        escrowAmount = project_fees; // 100% upfront
      }
      // For milestone-based, amount will be set per milestone
    }

    // Create job post
    const jobPost = new JobPost({
      employer: employerId,
      job_title,
      job_description,
      project_fees,
      experience,
      address,
      contact,
      application_deadline,
      job_duration,
      profession,
      escrow_enabled,
      escrow_type: escrow_enabled ? escrow_type : null,
      escrow_amount: escrowAmount,
      contract_status: "open",
    });

    await jobPost.save();

    let escrowId = null;

    // If escrow enabled, pre-create escrow account (pending contractor)
    if (escrow_enabled) {
      const serviceFee = escrowAmount * 0.1; // 10% service fee
      const netAmount = escrowAmount - serviceFee;

      const escrow = new Escrow({
        employer_id: employerId,
        contractor_id: null, // Will be filled when contractor accepts
        job_post_id: jobPost._id,
        title: job_title,
        description: job_description,
        agreed_amount: project_fees,
        initial_deposit: escrowAmount,
        service_fee: serviceFee,
        net_amount: netAmount,
        escrow_balance: netAmount,
        status: "pending_deposit",
        full_payment_upfront: escrow_type === "full_payment",
      });

      await escrow.save();
      escrowId = escrow._id;

      // Link escrow to job
      jobPost.escrow_id = escrowId;
      await jobPost.save();
    }

    res.status(201).json({
      success: true,
      message: "Job post created successfully",
      jobPost,
      escrowId: escrowId,
      escrowStatus: escrow_enabled ? "pending_deposit" : null,
    });
  } catch (error) {
    console.error("Error creating job with escrow:", error);
    res.status(500).json({
      success: false,
      message: "Error creating job post",
      error: error.message,
    });
  }
};

// ============================================
// CONTRACTOR ACCEPTS JOB - AUTO FETCH CONTRACTOR ID
// ============================================
exports.acceptJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const contractorId = req.userid; // Current user is the contractor

    // Validate job exists
    const jobPost = await JobPost.findById(jobId);
    if (!jobPost) {
      return res.status(404).json({
        success: false,
        message: "Job post not found",
      });
    }

    // Check if already assigned
    if (jobPost.selected_contractor_id) {
      return res.status(400).json({
        success: false,
        message: "This job is already assigned to another contractor",
      });
    }

    // Update job post
    jobPost.selected_contractor_id = contractorId;
    jobPost.contract_status = "in_progress";
    jobPost.work_start_date = new Date();
    await jobPost.save();

    let escrowUpdated = false;

    // AUTO-FETCH: Update linked escrow with contractor ID
    if (jobPost.escrow_id) {
      const escrow = await Escrow.findById(jobPost.escrow_id);

      if (escrow && !escrow.contractor_id) {
        // Only update if contractor not already set
        escrow.contractor_id = contractorId; // AUTO FETCH - Set contractor ID
        escrow.job_accepted_at = new Date();
        escrow.work_start_date = new Date();
        escrow.status = "active"; // Change status to active
        await escrow.save();
        escrowUpdated = true;
      }
    }

    res.status(200).json({
      success: true,
      message: "Job accepted successfully",
      jobPost: {
        id: jobPost._id,
        title: jobPost.job_title,
        selectedContractorId: jobPost.selected_contractor_id,
        contractStatus: jobPost.contract_status,
        escrowId: jobPost.escrow_id,
      },
      contractorFetched: {
        contractorId: contractorId.toString(),
        escrowUpdated: escrowUpdated,
        escrowStatus: escrowUpdated ? "active" : null,
      },
    });
  } catch (error) {
    console.error("Error accepting job:", error);
    res.status(500).json({
      success: false,
      message: "Error accepting job",
      error: error.message,
    });
  }
};

// ============================================
// GET JOB WITH ESCROW DETAILS
// ============================================
exports.getJobWithEscrow = async (req, res) => {
  try {
    const { jobId } = req.params;

    const jobPost = await JobPost.findById(jobId)
      .populate("employer", "first_name last_name email business")
      .populate("selected_contractor_id", "first_name last_name email avatar")
      .populate({
        path: "escrow_id",
        select:
          "contractor_id employer_id status agreed_amount initial_deposit service_fee net_amount escrow_balance released_amount",
        populate: [
          {
            path: "contractor_id",
            select: "first_name last_name email avatar",
          },
          { path: "employer_id", select: "first_name last_name" },
        ],
      })
      .populate("profession", "name");

    if (!jobPost) {
      return res.status(404).json({
        success: false,
        message: "Job post not found",
      });
    }

    res.status(200).json({
      success: true,
      jobPost,
    });
  } catch (error) {
    console.error("Error fetching job:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching job",
      error: error.message,
    });
  }
};

// ============================================
// MARK JOB AS COMPLETED - UPDATE ESCROW
// ============================================
exports.completeJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { completionProof, notes } = req.body;
    const contractorId = req.userid;

    // Validate job exists
    const jobPost = await JobPost.findById(jobId);
    if (!jobPost) {
      return res.status(404).json({
        success: false,
        message: "Job post not found",
      });
    }

    // Verify contractor is assigned
    if (jobPost.selected_contractor_id.toString() !== contractorId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only assigned contractor can mark as complete",
      });
    }

    // Update job
    jobPost.contract_status = "completed";
    jobPost.work_completion_date = new Date();
    await jobPost.save();

    // Update linked escrow
    if (jobPost.escrow_id) {
      const escrow = await Escrow.findById(jobPost.escrow_id);

      if (escrow) {
        escrow.status = "completion_requested";
        escrow.completion_proof = {
          url: completionProof || null,
          note: notes || "",
          submitted_at: new Date(),
        };
        escrow.actual_completion_date = new Date();
        await escrow.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Job marked as completed. Awaiting employer confirmation.",
      jobPost: {
        id: jobPost._id,
        contractStatus: jobPost.contract_status,
        workCompletionDate: jobPost.work_completion_date,
      },
      escrowStatus: "completion_requested",
    });
  } catch (error) {
    console.error("Error completing job:", error);
    res.status(500).json({
      success: false,
      message: "Error completing job",
      error: error.message,
    });
  }
};

// ============================================
// EMPLOYER CONFIRMS JOB COMPLETION
// ============================================
exports.confirmJobCompletion = async (req, res) => {
  try {
    const { jobId } = req.params;
    const employerId = req.userid;

    // Validate job exists
    const jobPost = await JobPost.findById(jobId);
    if (!jobPost) {
      return res.status(404).json({
        success: false,
        message: "Job post not found",
      });
    }

    // Verify employer owns the job
    if (jobPost.employer.toString() !== employerId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only job owner can confirm completion",
      });
    }

    // Update job
    jobPost.contract_status = "completed";
    await jobPost.save();

    // Update linked escrow
    if (jobPost.escrow_id) {
      const escrow = await Escrow.findById(jobPost.escrow_id);

      if (escrow) {
        escrow.status = "completed";
        escrow.employer_confirmed = true;
        escrow.employer_confirmed_at = new Date();
        // In real implementation, trigger payment release here
        await escrow.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Job completion confirmed. Payment released.",
      jobPost,
      escrowStatus: "completed",
    });
  } catch (error) {
    console.error("Error confirming job completion:", error);
    res.status(500).json({
      success: false,
      message: "Error confirming job completion",
      error: error.message,
    });
  }
};

// ============================================
// GET ALL JOBS FOR EMPLOYER
// ============================================
exports.getEmployerJobs = async (req, res) => {
  try {
    const employerId = req.userid;
    const { status, escrowOnly, page = 1, limit = 10 } = req.query;

    let query = { employer: employerId };

    if (status) {
      query.contract_status = status;
    }

    if (escrowOnly === "true") {
      query.escrow_enabled = true;
    }

    const skip = (page - 1) * limit;

    const jobs = await JobPost.find(query)
      .populate("selected_contractor_id", "first_name last_name email avatar")
      .populate("escrow_id", "status contractor_id agreed_amount")
      .populate("profession", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await JobPost.countDocuments(query);

    res.status(200).json({
      success: true,
      jobs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching employer jobs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching jobs",
      error: error.message,
    });
  }
};

// ============================================
// GET ALL JOBS FOR CONTRACTOR
// ============================================
exports.getContractorJobs = async (req, res) => {
  try {
    const contractorId = req.userid;
    const { status, escrowOnly, page = 1, limit = 10 } = req.query;

    let query = { selected_contractor_id: contractorId };

    if (status) {
      query.contract_status = status;
    }

    if (escrowOnly === "true") {
      query.escrow_enabled = true;
    }

    const skip = (page - 1) * limit;

    const jobs = await JobPost.find(query)
      .populate("employer", "first_name last_name email business")
      .populate("escrow_id", "status agreed_amount escrow_balance")
      .populate("profession", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await JobPost.countDocuments(query);

    res.status(200).json({
      success: true,
      jobs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching contractor jobs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching jobs",
      error: error.message,
    });
  }
};

// ============================================
// GET ALL JOBS FOR PUBLIC LISTING
// ============================================
exports.get_all_jobs = async (req, res) => {
  try {
    const {
      status,
      profession,
      employerId,
      contractorId,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};
    if (status) query.contract_status = status;
    if (profession) query.profession = profession;
    if (employerId) query.employer = employerId;
    if (contractorId) query.selected_contractor_id = contractorId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const jobs = await JobPost.find(query)
      .populate("employer", "first_name last_name email business")
      .populate("escrow_id", "status agreed_amount escrow_balance")
      .populate("profession", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await JobPost.countDocuments(query);

    res.status(200).json({
      success: true,
      jobs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching all jobs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching jobs",
      error: error.message,
    });
  }
};

// ============================================
// GET JOBS BY PROFESSION
// ============================================
exports.getJobsByProfession = async (req, res) => {
  try {
    const { professionId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const query = { profession: professionId };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const jobs = await JobPost.find(query)
      .populate("employer", "first_name last_name email business")
      .populate("escrow_id", "status agreed_amount escrow_balance")
      .populate("profession", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await JobPost.countDocuments(query);

    res.status(200).json({
      success: true,
      jobs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching jobs by profession:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching jobs",
      error: error.message,
    });
  }
};

// ============================================
// GET CONTRACTOR APPLIED JOBS BY CONTRACTOR ID
// ============================================
exports.contractor_applied_jobs = async (req, res) => {
  try {
    const { contractor_id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const query = { selected_contractor_id: contractor_id };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const jobs = await JobPost.find(query)
      .populate("employer", "first_name last_name email business")
      .populate("escrow_id", "status agreed_amount escrow_balance")
      .populate("profession", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await JobPost.countDocuments(query);

    res.status(200).json({
      success: true,
      jobs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching contractor applied jobs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching jobs",
      error: error.message,
    });
  }
};

// ============================================
// GET CLIENT JOBS BY CLIENT ID
// ============================================
exports.client_jobs = async (req, res) => {
  try {
    const { client_id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const query = { employer: client_id };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const jobs = await JobPost.find(query)
      .populate("selected_contractor_id", "first_name last_name email avatar")
      .populate("escrow_id", "status agreed_amount escrow_balance")
      .populate("profession", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await JobPost.countDocuments(query);

    res.status(200).json({
      success: true,
      jobs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching client jobs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching jobs",
      error: error.message,
    });
  }
};

// ============================================
// GET EMPLOYER JOBS BY EMPLOYER ID
// ============================================
exports.getJobsByEmployer = async (req, res) => {
  try {
    const { employerId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const query = { employer: employerId };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const jobs = await JobPost.find(query)
      .populate("selected_contractor_id", "first_name last_name email avatar")
      .populate("escrow_id", "status agreed_amount escrow_balance")
      .populate("profession", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await JobPost.countDocuments(query);

    res.status(200).json({
      success: true,
      jobs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching employer jobs by id:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching jobs",
      error: error.message,
    });
  }
};

// ============================================
// STORE JOB APPLICATION
// ============================================
exports.store_applied_jobs = async (req, res) => {
  try {
    const { job_id, contractor_id, notes } = req.body;
    const document = req.file ? req.file.path : null;

    if (!job_id || !contractor_id) {
      return res.status(400).json({
        success: false,
        message: "job_id and contractor_id are required",
      });
    }

    const jobPost = await JobPost.findById(job_id);
    if (!jobPost) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    jobPost.is_applied = true;
    await jobPost.save();

    return res.status(200).json({
      success: true,
      message: "Application recorded",
      jobPost,
      document,
      notes,
    });
  } catch (error) {
    console.error("Error storing applied jobs:", error);
    res.status(500).json({
      success: false,
      message: "Error recording applied job",
      error: error.message,
    });
  }
};

// ============================================
// CREATE JOB WITHOUT ESCROW
// ============================================
exports.addJobs = async (req, res) => {
  try {
    const { employerId } = req.params;
    const {
      job_title,
      job_description,
      project_fees,
      experience,
      address,
      contact,
      application_deadline,
      job_duration,
      profession,
    } = req.body;

    if (!job_title || !job_description || !project_fees || !experience || !application_deadline || !job_duration || !profession) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields for job creation",
      });
    }

    const jobPost = new JobPost({
      employer: employerId,
      job_title,
      job_description,
      project_fees,
      experience,
      address,
      contact,
      application_deadline,
      job_duration,
      profession,
      contract_status: "open",
    });

    await jobPost.save();
    return res.status(201).json({
      success: true,
      message: "Job created successfully",
      jobPost,
    });
  } catch (error) {
    console.error("Error adding job:", error);
    res.status(500).json({
      success: false,
      message: "Error creating job",
      error: error.message,
    });
  }
};

// ============================================
// DELETE APPLIED JOB BY ID
// ============================================
exports.delete_applied_jobs = async (req, res) => {
  try {
    const { id } = req.params;
    const jobPost = await JobPost.findByIdAndDelete(id);
    if (!jobPost) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Applied job deleted successfully",
      jobPost,
    });
  } catch (error) {
    console.error("Error deleting applied job:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting job",
      error: error.message,
    });
  }
};

// ============================================
// DELETE PROF JOB BY ID
// ============================================
exports.delete_prof_jobs = async (req, res) => {
  try {
    const { id } = req.params;
    const jobPost = await JobPost.findByIdAndDelete(id);
    if (!jobPost) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Job deleted successfully",
      jobPost,
    });
  } catch (error) {
    console.error("Error deleting prof job:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting job",
      error: error.message,
    });
  }
};