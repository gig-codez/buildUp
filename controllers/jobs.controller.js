const JobPost = require("../models/jobPost.model");
const AppliedJobs = require("../models/applied_jobs.model");
const Escrow = require("../models/escrow.model");
const Wallet = require("../models/wallet.model");
const Contractor = require("../models/freelancer.model");
const Employer = require("../models/employer.model");
const mailSender = require("../utils/mailSender");
const { v4: uuidv4 } = require("uuid");

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
      escrow_enabled,
      escrow_type = "partial_60_40",
    } = req.body;

    const employerId = req.userid;

    if (!job_title || !project_fees) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: job_title, project_fees",
      });
    }

    let escrowAmount = project_fees;
    if (escrow_enabled) {
      if (escrow_type === "partial_60_40") {
        escrowAmount = project_fees * 0.6;
      } else if (escrow_type === "full_payment") {
        escrowAmount = project_fees;
      }
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
      escrow_enabled,
      escrow_type: escrow_enabled ? escrow_type : null,
      escrow_amount: escrowAmount,
      contract_status: "open",
    });

    await jobPost.save();

    let escrowId = null;

    if (escrow_enabled) {
      const serviceFee = escrowAmount * 0.1;
      const netAmount = escrowAmount - serviceFee;

      const escrow = new Escrow({
        employer_id: employerId,
        contractor_id: null,
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

      jobPost.escrow_id = escrowId;
      await jobPost.save();
    }

    res.status(201).json({
      success: true,
      message: "Job post created successfully",
      jobPost,
      escrowId,
      escrowStatus: escrow_enabled ? "pending_deposit" : null,
    });
  } catch (error) {
    console.error("Error creating job with escrow:", error);
    res.status(500).json({ success: false, message: "Error creating job post", error: error.message });
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
      return res.status(400).json({ success: false, message: "Missing required fields for job creation" });
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
    return res.status(201).json({ success: true, message: "Job created successfully", jobPost });
  } catch (error) {
    console.error("Error adding job:", error);
    res.status(500).json({ success: false, message: "Error creating job", error: error.message });
  }
};

// ============================================
// STORE JOB APPLICATION (contractor applies)
// Creates an AppliedJobs record with status="pending"
// Job stays open; contractor can see it in Applied Jobs
// Job disappears from feed (filtered in getContractorJobs)
// ============================================
exports.store_applied_jobs = async (req, res) => {
  try {
    const { job_id, contractor_id, notes } = req.body;
    const document = req.file ? req.file.path : null;

    if (!job_id || !contractor_id) {
      return res.status(400).json({ success: false, message: "job_id and contractor_id are required" });
    }

    const jobPost = await JobPost.findById(job_id);
    if (!jobPost) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (jobPost.contract_status !== "open") {
      return res.status(400).json({ success: false, message: "This job is no longer accepting applications" });
    }

    // Check for duplicate application
    const existingApplication = await AppliedJobs.findOne({ contractorId: contractor_id, jobId: job_id });
    if (existingApplication) {
      return res.status(400).json({ success: false, message: "You have already applied for this job" });
    }

    // Create the application record (pending approval from client)
    const application = new AppliedJobs({
      contractorId: contractor_id,
      clientId: jobPost.employer,
      jobId: job_id,
      document: document || "",
      notes: notes || "",
      status: "pending",
    });

    await application.save();

    // Populate for response
    const populated = await AppliedJobs.findById(application._id)
      .populate("contractorId", "first_name last_name email tel_num profile_pic profession gender address")
      .populate("clientId", "first_name last_name email_address")
      .populate("jobId", "job_title job_description project_fees address application_deadline job_duration");

    return res.status(200).json({
      success: true,
      message: "Application submitted successfully. Awaiting client review.",
      application: populated,
    });
  } catch (error) {
    console.error("Error storing applied jobs:", error);
    res.status(500).json({ success: false, message: "Error recording application", error: error.message });
  }
};

// ============================================
// CLIENT ACCEPTS APPLICATION -> hires contractor
// Sets selected_contractor_id, moves job to in_progress,
// links contractor to escrow
// ============================================
exports.acceptApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const employerId = req.userid;

    const application = await AppliedJobs.findById(applicationId)
      .populate("contractorId", "first_name last_name email tel_num")
      .populate("jobId");

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    if (application.clientId.toString() !== employerId.toString()) {
      return res.status(403).json({ success: false, message: "Only the job owner can accept applications" });
    }

    if (application.status !== "pending") {
      return res.status(400).json({ success: false, message: "This application has already been processed" });
    }

    const jobPost = application.jobId;
    if (jobPost.selected_contractor_id) {
      return res.status(400).json({ success: false, message: "This job already has a hired contractor" });
    }

    // Mark application as accepted
    application.status = "accepted";
    await application.save();

    // Decline all other pending applications for this job
    await AppliedJobs.updateMany(
      { jobId: jobPost._id, _id: { $ne: applicationId }, status: "pending" },
      { $set: { status: "declined" } }
    );

    // Update the job post
    const contractorId = application.contractorId._id;
    jobPost.selected_contractor_id = contractorId;
    jobPost.contract_status = "in_progress";
    jobPost.work_start_date = new Date();
    await jobPost.save();

    // Update linked escrow with contractor
    let escrowUpdated = false;
    if (jobPost.escrow_id) {
      const escrow = await Escrow.findById(jobPost.escrow_id);
      if (escrow && !escrow.contractor_id) {
        escrow.contractor_id = contractorId;
        escrow.job_accepted_at = new Date();
        escrow.work_start_date = new Date();
        escrow.status = "active";
        await escrow.save();
        escrowUpdated = true;
      }
    }

    // Notify contractor via email
    try {
      const employer = await Employer.findById(employerId);
      await mailSender(
        application.contractorId.email,
        "Congratulations! Your application was accepted",
        `<p>Hi ${application.contractorId.first_name},</p>
         <p><b>${employer ? employer.first_name + " " + employer.last_name : "A client"}</b> has accepted your application for the job: <b>${jobPost.job_title}</b>.</p>
         <p>The job is now in progress. Please log in to view your active contract.</p>
         ${jobPost.escrow_id ? "<p>An escrow has been set up to protect your payment.</p>" : ""}
         <p>Good luck!</p>`
      );
    } catch (mailErr) {
      console.error("Failed to send acceptance email:", mailErr);
    }

    return res.status(200).json({
      success: true,
      message: "Application accepted. Contractor has been hired.",
      jobPost: {
        id: jobPost._id,
        title: jobPost.job_title,
        contractStatus: jobPost.contract_status,
        selectedContractorId: contractorId,
      },
      escrowUpdated,
    });
  } catch (error) {
    console.error("Error accepting application:", error);
    res.status(500).json({ success: false, message: "Error accepting application", error: error.message });
  }
};

// ============================================
// CLIENT DECLINES APPLICATION
// ============================================
exports.declineApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const employerId = req.userid;

    const application = await AppliedJobs.findById(applicationId)
      .populate("contractorId", "first_name last_name email")
      .populate("jobId", "job_title employer");

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    if (application.clientId.toString() !== employerId.toString()) {
      return res.status(403).json({ success: false, message: "Only the job owner can decline applications" });
    }

    if (application.status !== "pending") {
      return res.status(400).json({ success: false, message: "This application has already been processed" });
    }

    application.status = "declined";
    await application.save();

    // Notify contractor
    try {
      await mailSender(
        application.contractorId.email,
        "Application Update",
        `<p>Hi ${application.contractorId.first_name},</p>
         <p>Unfortunately, your application for <b>${application.jobId.job_title}</b> was not selected at this time.</p>
         <p>Keep applying — there are many more opportunities on BuildUp!</p>`
      );
    } catch (mailErr) {
      console.error("Failed to send decline email:", mailErr);
    }

    return res.status(200).json({ success: true, message: "Application declined." });
  } catch (error) {
    console.error("Error declining application:", error);
    res.status(500).json({ success: false, message: "Error declining application", error: error.message });
  }
};

// ============================================
// GET CONTRACTOR APPLIED JOBS
// Returns all applications for this contractor (with status)
// ============================================
exports.contractor_applied_jobs = async (req, res) => {
  try {
    const { contractor_id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const applications = await AppliedJobs.find({ contractorId: contractor_id })
      .populate({
        path: "jobId",
        select: "job_title job_description project_fees address application_deadline job_duration profession employer escrow_enabled contract_status",
        populate: { path: "profession", select: "name" },
      })
      .populate("clientId", "first_name last_name email_address business")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AppliedJobs.countDocuments({ contractorId: contractor_id });

    return res.status(200).json({
      success: true,
      applications,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching contractor applied jobs:", error);
    res.status(500).json({ success: false, message: "Error fetching applications", error: error.message });
  }
};

// ============================================
// GET CLIENT APPLICATIONS (applications for a client's jobs)
// ============================================
exports.client_jobs = async (req, res) => {
  try {
    const { client_id } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = { clientId: client_id };
    if (status) query.status = status;

    const applications = await AppliedJobs.find(query)
      .populate({
        path: "contractorId",
        select: "first_name last_name email tel_num profile_pic profession gender address",
        populate: { path: "profession", select: "name" },
      })
      .populate({
        path: "jobId",
        select: "job_title job_description project_fees application_deadline escrow_enabled contract_status",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AppliedJobs.countDocuments(query);

    return res.status(200).json({
      success: true,
      totalDocuments: total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      pageSize: parseInt(limit),
      jobs: applications,
    });
  } catch (error) {
    console.error("Error fetching client applications:", error);
    res.status(500).json({ success: false, message: "Error fetching applications", error: error.message });
  }
};

// ============================================
// GET ALL AVAILABLE JOBS FOR CONTRACTOR
// Excludes jobs they've already applied for
// ============================================
exports.getContractorJobs = async (req, res) => {
  try {
    const contractorId = req.userid;
    const { status, escrowOnly, page = 1, limit = 10 } = req.query;

    // Find IDs of jobs this contractor has already applied to
    const myApplications = await AppliedJobs.find(
      { contractorId },
      { jobId: 1 }
    ).lean();
    const appliedJobIds = myApplications.map((a) => a.jobId.toString());

    let query = {
      contract_status: "open",
      selected_contractor_id: null,
      _id: { $nin: appliedJobIds },
    };

    if (status) query.contract_status = status;
    if (escrowOnly === "true") query.escrow_enabled = true;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const jobs = await JobPost.find(query)
      .populate("employer", "first_name last_name email business")
      .populate("escrow_id", "status agreed_amount escrow_balance")
      .populate("profession", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await JobPost.countDocuments(query);

    return res.status(200).json({
      success: true,
      jobs,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching contractor jobs:", error);
    res.status(500).json({ success: false, message: "Error fetching jobs", error: error.message });
  }
};

// ============================================
// GET CONTRACTOR ASSIGNED JOBS (accepted/in_progress)
// ============================================
exports.getContractorAssignedJobs = async (req, res) => {
  try {
    const contractorId = req.userid;
    const { status, escrowOnly, page = 1, limit = 10 } = req.query;

    let query = { selected_contractor_id: contractorId };
    if (status) query.contract_status = status;
    if (escrowOnly === "true") query.escrow_enabled = true;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const jobs = await JobPost.find(query)
      .populate("employer", "first_name last_name email business")
      .populate("escrow_id", "status agreed_amount escrow_balance")
      .populate("profession", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await JobPost.countDocuments(query);

    return res.status(200).json({
      success: true,
      jobs,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching contractor assigned jobs:", error);
    res.status(500).json({ success: false, message: "Error fetching jobs", error: error.message });
  }
};

// ============================================
// GET EMPLOYER JOBS
// ============================================
exports.getEmployerJobs = async (req, res) => {
  try {
    const employerId = req.userid;
    const { status, escrowOnly, page = 1, limit = 10 } = req.query;

    let query = { employer: employerId };
    if (status) query.contract_status = status;
    if (escrowOnly === "true") query.escrow_enabled = true;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const jobs = await JobPost.find(query)
      .populate("selected_contractor_id", "first_name last_name email avatar")
      .populate("escrow_id", "status contractor_id agreed_amount")
      .populate("profession", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await JobPost.countDocuments(query);

    return res.status(200).json({
      success: true,
      jobs,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching employer jobs:", error);
    res.status(500).json({ success: false, message: "Error fetching jobs", error: error.message });
  }
};

// ============================================
// GET ALL JOBS (public listing)
// ============================================
exports.get_all_jobs = async (req, res) => {
  try {
    const { status, profession, employerId, contractorId, page = 1, limit = 10 } = req.query;

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

    return res.status(200).json({
      success: true,
      jobs,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching all jobs:", error);
    res.status(500).json({ success: false, message: "Error fetching jobs", error: error.message });
  }
};

// ============================================
// GET JOBS BY PROFESSION
// ============================================
exports.getJobsByProfession = async (req, res) => {
  try {
    const { professionId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const query = { profession: professionId, contract_status: "open" };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const jobs = await JobPost.find(query)
      .populate("employer", "first_name last_name email business")
      .populate("escrow_id", "status agreed_amount escrow_balance")
      .populate("profession", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await JobPost.countDocuments(query);

    return res.status(200).json({
      success: true,
      jobs,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching jobs by profession:", error);
    res.status(500).json({ success: false, message: "Error fetching jobs", error: error.message });
  }
};

// ============================================
// GET JOBS BY EMPLOYER ID
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

    return res.status(200).json({
      success: true,
      jobs,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching employer jobs by id:", error);
    res.status(500).json({ success: false, message: "Error fetching jobs", error: error.message });
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
        select: "contractor_id employer_id status agreed_amount initial_deposit service_fee net_amount escrow_balance released_amount",
        populate: [
          { path: "contractor_id", select: "first_name last_name email avatar" },
          { path: "employer_id", select: "first_name last_name" },
        ],
      })
      .populate("profession", "name");

    if (!jobPost) {
      return res.status(404).json({ success: false, message: "Job post not found" });
    }

    return res.status(200).json({ success: true, jobPost });
  } catch (error) {
    console.error("Error fetching job:", error);
    res.status(500).json({ success: false, message: "Error fetching job", error: error.message });
  }
};

// ============================================
// MARK JOB AS COMPLETED (contractor submits)
// ============================================
exports.completeJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { completionProof, notes } = req.body;
    const contractorId = req.userid;

    const jobPost = await JobPost.findById(jobId);
    if (!jobPost) {
      return res.status(404).json({ success: false, message: "Job post not found" });
    }

    if (!jobPost.selected_contractor_id || jobPost.selected_contractor_id.toString() !== contractorId.toString()) {
      return res.status(403).json({ success: false, message: "Only assigned contractor can mark as complete" });
    }

    if (jobPost.contract_status !== "in_progress") {
      return res.status(400).json({ success: false, message: "Job is not in progress" });
    }

    jobPost.contract_status = "completed";
    jobPost.work_completion_date = new Date();
    await jobPost.save();

    if (jobPost.escrow_id) {
      const escrow = await Escrow.findById(jobPost.escrow_id);
      if (escrow && escrow.status === "active") {
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

    // Notify employer
    try {
      const employer = await Employer.findById(jobPost.employer);
      const contractor = await Contractor.findById(contractorId);
      if (employer && contractor) {
        await mailSender(
          employer.email_address,
          "Job Completion Submitted",
          `<p>Hi ${employer.first_name},</p>
           <p><b>${contractor.first_name} ${contractor.last_name}</b> has submitted completion for the job: <b>${jobPost.job_title}</b>.</p>
           <p>Please log in to review and confirm the work, then release payment.</p>`
        );
      }
    } catch (mailErr) {
      console.error("Failed to send completion email:", mailErr);
    }

    return res.status(200).json({
      success: true,
      message: "Job marked as completed. Awaiting employer confirmation.",
      jobPost: { id: jobPost._id, contractStatus: jobPost.contract_status, workCompletionDate: jobPost.work_completion_date },
      escrowStatus: "completion_requested",
    });
  } catch (error) {
    console.error("Error completing job:", error);
    res.status(500).json({ success: false, message: "Error completing job", error: error.message });
  }
};

// ============================================
// EMPLOYER CONFIRMS JOB COMPLETION + RELEASES ESCROW FUNDS
// ============================================
exports.confirmJobCompletion = async (req, res) => {
  try {
    const { jobId } = req.params;
    const employerId = req.userid;

    const jobPost = await JobPost.findById(jobId);
    if (!jobPost) {
      return res.status(404).json({ success: false, message: "Job post not found" });
    }

    if (jobPost.employer.toString() !== employerId.toString()) {
      return res.status(403).json({ success: false, message: "Only job owner can confirm completion" });
    }

    if (jobPost.contract_status !== "completed") {
      return res.status(400).json({ success: false, message: "Contractor has not marked this job as complete yet" });
    }

    jobPost.employer_confirmed = true;
    await jobPost.save();

    let fundsReleased = false;
    let releasedAmount = 0;

    // Release escrow funds to contractor wallet
    if (jobPost.escrow_id) {
      const escrow = await Escrow.findById(jobPost.escrow_id)
        .populate("contractor_id", "first_name last_name email")
        .populate("employer_id", "first_name last_name");

      if (escrow && escrow.status === "completion_requested") {
        const contractorId = jobPost.selected_contractor_id;

        // Determine total release amount
        const totalRelease = escrow.net_amount; // Full net (agreed - 10% fee)

        // Credit contractor wallet
        let wallet = await Wallet.findOne({ owner_id: contractorId, owner_type: "freelancer" });
        if (!wallet) {
          wallet = new Wallet({ owner_id: contractorId, owner_type: "freelancer" });
        }

        wallet.available_balance += totalRelease;
        wallet.total_earned += totalRelease;
        wallet.transactions.push({
          type: "credit",
          amount: totalRelease,
          description: `Payment released for job: ${jobPost.job_title}`,
          reference: uuidv4(),
          escrow_id: escrow._id,
          status: "completed",
        });
        await wallet.save();

        // Mark escrow as completed
        escrow.status = "completed";
        escrow.employer_confirmed = true;
        escrow.employer_confirmed_at = new Date();
        escrow.released_amount = totalRelease;
        escrow.escrow_balance = 0;
        await escrow.save();

        fundsReleased = true;
        releasedAmount = totalRelease;

        // Notify contractor of payment
        if (escrow.contractor_id) {
          try {
            await mailSender(
              escrow.contractor_id.email,
              "Payment Released to Your Wallet!",
              `<p>Hi ${escrow.contractor_id.first_name},</p>
               <p><b>UGX ${totalRelease.toLocaleString()}</b> has been released to your BuildUp wallet for job: <b>${jobPost.job_title}</b>.</p>
               <p>You can now withdraw to your mobile money account from the Payments section.</p>`
            );
          } catch (mailErr) {
            console.error("Failed to send payment release email:", mailErr);
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: fundsReleased
        ? `Job confirmed. UGX ${releasedAmount.toLocaleString()} released to contractor wallet.`
        : "Job completion confirmed.",
      jobPost,
      fundsReleased,
      releasedAmount,
      escrowStatus: fundsReleased ? "completed" : "unchanged",
    });
  } catch (error) {
    console.error("Error confirming job completion:", error);
    res.status(500).json({ success: false, message: "Error confirming job completion", error: error.message });
  }
};

// ============================================
// DELETE APPLIED JOB APPLICATION
// ============================================
exports.delete_applied_jobs = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await AppliedJobs.findByIdAndDelete(id);
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }
    return res.status(200).json({ success: true, message: "Application deleted successfully" });
  } catch (error) {
    console.error("Error deleting applied job:", error);
    res.status(500).json({ success: false, message: "Error deleting application", error: error.message });
  }
};

// ============================================
// DELETE JOB BY ID
// ============================================
exports.delete_prof_jobs = async (req, res) => {
  try {
    const { id } = req.params;
    const jobPost = await JobPost.findByIdAndDelete(id);
    if (!jobPost) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    return res.status(200).json({ success: true, message: "Job deleted successfully", jobPost });
  } catch (error) {
    console.error("Error deleting prof job:", error);
    res.status(500).json({ success: false, message: "Error deleting job", error: error.message });
  }
};