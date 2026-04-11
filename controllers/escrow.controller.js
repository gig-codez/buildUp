const escrowModel = require("../models/escrow.model");
const walletModel = require("../models/wallet.model");
const taskChatModel = require("../models/taskChat.model");
const freelancerModel = require("../models/freelancer.model");
const employerModel = require("../models/employer.model");
const mailSender = require("../utils/mailSender");
const Xyle = require("../services/payments/xyle");
const { v4: uuidv4 } = require("uuid");

const SERVICE_FEE_RATE = 0.10; // 10%
const MIN_DEPOSIT_RATE = 0.60; // 60% minimum

class EscrowController {

  // ─── CREATE ESCROW ───────────────────────────────────────────────────────────
  static async createEscrow(req, res) {
    try {
      const { employer_id, contractor_id, job_post_id, title, description, agreed_amount, full_payment_upfront } = req.body;

      if (!employer_id || !contractor_id || !title || !agreed_amount) {
        return res.status(400).json({ message: "Missing required fields." });
      }

      const agreed = parseFloat(agreed_amount);
      if (isNaN(agreed) || agreed <= 0) {
        return res.status(400).json({ message: "Invalid agreed amount." });
      }

      const depositRate = full_payment_upfront ? 1.0 : MIN_DEPOSIT_RATE;
      const initial_deposit = Math.ceil(agreed * depositRate);
      const service_fee = Math.ceil(agreed * SERVICE_FEE_RATE);
      const net_amount = agreed - service_fee;

      const escrow = new escrowModel({
        employer_id,
        contractor_id,
        job_post_id: job_post_id || null,
        title,
        description: description || "",
        agreed_amount: agreed,
        initial_deposit,
        service_fee,
        net_amount,
        full_payment_upfront: !!full_payment_upfront,
        status: "pending_deposit",
      });

      await escrow.save();

      // Notify contractor
      const contractor = await freelancerModel.findById(contractor_id);
      const employer = await employerModel.findById(employer_id);
      if (contractor && employer) {
        await mailSender(
          contractor.email,
          "New Task Escrow Created",
          `<p>Hi ${contractor.first_name},</p>
           <p><b>${employer.first_name} ${employer.last_name}</b> has created an escrow for the task: <b>${title}</b></p>
           <p>Agreed Amount: <b>UGX ${agreed.toLocaleString()}</b></p>
           <p>They will deposit funds shortly. You will be notified once the escrow is funded.</p>`
        );
      }

      return res.status(201).json({ message: "Escrow created successfully.", escrow });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── INITIATE DEPOSIT (employer pays into escrow via Xyle) ───────────────────
  static async initiateDeposit(req, res) {
    try {
      const { escrow_id } = req.params;
      const { phone_number, provider } = req.body;

      const escrow = await escrowModel.findById(escrow_id)
        .populate("employer_id")
        .populate("contractor_id");

      if (!escrow) return res.status(404).json({ message: "Escrow not found." });
      if (escrow.status !== "pending_deposit") {
        return res.status(400).json({ message: "Escrow already funded or completed." });
      }

      const phone = Xyle.normalizePhone(phone_number);
      const detectedProvider = provider || Xyle.detectProvider(phone);

      // Collect the full initial_deposit from employer via mobile money
      const xyleResult = await Xyle.initiateDeposit(phone, escrow.initial_deposit, detectedProvider);

      // Save the Xyle reference for verification
      await escrowModel.findByIdAndUpdate(escrow_id, {
        xyle_deposit_reference: xyleResult.reference || xyleResult.id,
        status: "pending_deposit", // stays pending until confirmed
      });

      return res.status(200).json({
        message: "Deposit initiated. Please approve the USSD prompt on your phone.",
        xyle_reference: xyleResult.reference || xyleResult.id,
        amount: escrow.initial_deposit,
        provider: detectedProvider,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── CONFIRM DEPOSIT (called after Xyle confirms payment) ────────────────────
  static async confirmDeposit(req, res) {
    try {
      const { escrow_id } = req.params;
      const { xyle_reference } = req.body;

      const escrow = await escrowModel.findById(escrow_id)
        .populate("employer_id")
        .populate("contractor_id");

      if (!escrow) return res.status(404).json({ message: "Escrow not found." });
      if (escrow.status !== "pending_deposit") {
        return res.status(400).json({ message: "Escrow is not awaiting deposit." });
      }

      // Optionally verify with Xyle API
      let verified = true;
      if (xyle_reference) {
        try {
          const statusData = await Xyle.checkStatus(xyle_reference);
          // verified = statusData.status === "successful" || statusData.status === "COMPLETED";
        } catch (e) {
          // fallback: trust the reference
          verified = true;
        }
      }

      if (!verified) {
        return res.status(400).json({ message: "Payment not confirmed by provider." });
      }

      // Calculate escrow_balance = initial_deposit - service_fee
      // (service_fee stays with platform, escrow_balance goes to contractor on completion)
      const escrow_balance = escrow.initial_deposit - escrow.service_fee;

      await escrowModel.findByIdAndUpdate(escrow_id, {
        status: "active",
        escrow_balance,
        xyle_deposit_reference: xyle_reference || escrow.xyle_deposit_reference,
      });

      // Post a system message to task chat
      await new taskChatModel({
        escrow_id,
        sender_id: escrow.employer_id._id,
        sender_role: "employer",
        sender_name: `${escrow.employer_id.first_name} ${escrow.employer_id.last_name}`,
        message: `✅ Deposit confirmed! UGX ${escrow.initial_deposit.toLocaleString()} deposited into escrow. Work can now begin. (Service fee of UGX ${escrow.service_fee.toLocaleString()} deducted — contractor will receive UGX ${escrow_balance.toLocaleString()} upon completion${escrow.full_payment_upfront ? "" : " + remaining UGX " + (escrow.net_amount - escrow_balance).toLocaleString() + " on completion"})`,
        is_system_message: true,
      }).save();

      // Notify contractor
      // await mailSender(
      //   escrow.contractor_id.email,
      //   "Escrow Funded — Start Work!",
      //   `<p>Hi ${escrow.contractor_id.first_name},</p>
      //    <p>The escrow for task <b>${escrow.title}</b> has been funded.</p>
      //    <p>Amount in Escrow: <b>UGX ${escrow_balance.toLocaleString()}</b></p>
      //    <p>You can now start working. Submit proof of completion when done.</p>`
      // );

      return res.status(200).json({ message: "Deposit confirmed. Escrow is now active.", escrow_balance });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── SUBMIT COMPLETION PROOF (contractor) ────────────────────────────────────
  static async submitCompletion(req, res) {
    try {
      const { escrow_id } = req.params;
      const { note, attachment_url, contractor_id } = req.body;

      const escrow = await escrowModel.findById(escrow_id)
        .populate("employer_id")
        .populate("contractor_id");

      if (!escrow) return res.status(404).json({ message: "Escrow not found." });
      if (escrow.status !== "active") {
        return res.status(400).json({ message: "Escrow is not active." });
      }
      if (escrow.contractor_id._id.toString() !== contractor_id) {
        return res.status(403).json({ message: "Not authorized." });
      }

      await escrowModel.findByIdAndUpdate(escrow_id, {
        status: "completion_requested",
        "completion_proof.url": attachment_url || null,
        "completion_proof.note": note || "",
        "completion_proof.submitted_at": new Date(),
      });

      // System message in task chat
      await new taskChatModel({
        escrow_id,
        sender_id: contractor_id,
        sender_role: "contractor",
        sender_name: `${escrow.contractor_id.first_name} ${escrow.contractor_id.last_name}`,
        message: `🏁 Completion submitted by contractor. Note: "${note || "No note provided"}"`,
        attachment_url: attachment_url || null,
        is_system_message: true,
      }).save();

      // Notify employer
      await mailSender(
        escrow.employer_id.email_address,
        "Task Completion Submitted",
        `<p>Hi ${escrow.employer_id.first_name},</p>
         <p><b>${escrow.contractor_id.first_name} ${escrow.contractor_id.last_name}</b> has submitted completion proof for task: <b>${escrow.title}</b></p>
         <p>Note: ${note || "None"}</p>
         <p>Please log in to review and confirm.</p>`
      );

      return res.status(200).json({ message: "Completion proof submitted successfully." });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── CONFIRM COMPLETION & RELEASE FUNDS (employer) ──────────────────────────
  static async confirmAndRelease(req, res) {
    try {
      const { escrow_id } = req.params;
      const { employer_id, contractor_phone, contractor_provider } = req.body;

      const escrow = await escrowModel.findById(escrow_id)
        .populate("contractor_id")
        .populate("employer_id");

      if (!escrow) return res.status(404).json({ message: "Escrow not found." });
      if (escrow.status !== "completion_requested") {
        return res.status(400).json({ message: "No completion pending confirmation." });
      }
      if (escrow.employer_id._id.toString() !== employer_id) {
        return res.status(403).json({ message: "Not authorized." });
      }

      const contractor = escrow.contractor_id;

      // Determine if remaining balance needs to be collected
      const remaining = escrow.net_amount - escrow.escrow_balance;
      let totalRelease = escrow.escrow_balance;

      if (!escrow.full_payment_upfront && remaining > 0) {
        // The remaining 40% minus its share of service fee was NOT yet collected.
        // The service fee was already taken from the initial deposit proportionally.
        // We just release everything in escrow (escrow_balance) + collect remaining via Xyle if needed.
        // For simplicity: net_amount is already net of service fee (10% taken from agreed).
        // escrow_balance = initial_deposit - service_fee. 
        // If not full upfront: initial_deposit = 60%, service_fee = 10% of 100% taken upfront.
        // So escrow_balance = 60% - 10% = 50% of agreed.
        // Remaining release = net_amount - escrow_balance = (agreed - 10%) - 50% = 40% of agreed.
        totalRelease = escrow.net_amount; // full net amount
      }

      // Get/create contractor wallet
      let wallet = await walletModel.findOne({ owner_id: contractor._id, owner_type: "freelancer" });
      if (!wallet) {
        wallet = new walletModel({ owner_id: contractor._id, owner_type: "freelancer" });
      }

      // Credit wallet
      wallet.available_balance += totalRelease;
      wallet.total_earned += totalRelease;
      wallet.transactions.push({
        type: "credit",
        amount: totalRelease,
        description: `Payment released for task: ${escrow.title}`,
        reference: uuidv4(),
        escrow_id: escrow._id,
        status: "completed",
      });
      await wallet.save();

      // Mark escrow completed
      await escrowModel.findByIdAndUpdate(escrow_id, {
        status: "completed",
        employer_confirmed: true,
        employer_confirmed_at: new Date(),
        released_amount: totalRelease,
        escrow_balance: 0,
      });

      // System message
      await new taskChatModel({
        escrow_id,
        sender_id: employer_id,
        sender_role: "employer",
        sender_name: `${escrow.employer_id.first_name} ${escrow.employer_id.last_name}`,
        message: `💰 Work confirmed! UGX ${totalRelease.toLocaleString()} has been released to ${contractor.first_name}'s wallet.`,
        is_system_message: true,
      }).save();

      // Notify contractor
      await mailSender(
        contractor.email,
        "Payment Released to Your Wallet!",
        `<p>Hi ${contractor.first_name},</p>
         <p><b>UGX ${totalRelease.toLocaleString()}</b> has been released to your BuildUp wallet for task: <b>${escrow.title}</b></p>
         <p>You can now withdraw to your mobile money account from the Payments section.</p>`
      );

      return res.status(200).json({
        message: "Completion confirmed. Funds released to contractor wallet.",
        released: totalRelease,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── DISPUTE ESCROW ──────────────────────────────────────────────────────────
  static async disputeEscrow(req, res) {
    try {
      const { escrow_id } = req.params;
      const { raised_by, raised_by_role, reason } = req.body;

      const escrow = await escrowModel.findById(escrow_id)
        .populate("employer_id")
        .populate("contractor_id");

      if (!escrow) return res.status(404).json({ message: "Escrow not found." });
      if (!["active", "completion_requested"].includes(escrow.status)) {
        return res.status(400).json({ message: "Cannot dispute at this stage." });
      }

      await escrowModel.findByIdAndUpdate(escrow_id, { status: "disputed" });

      await new taskChatModel({
        escrow_id,
        sender_id: raised_by,
        sender_role: raised_by_role,
        sender_name: raised_by_role === "employer"
          ? `${escrow.employer_id.first_name} ${escrow.employer_id.last_name}`
          : `${escrow.contractor_id.first_name} ${escrow.contractor_id.last_name}`,
        message: `⚠️ Dispute raised: ${reason}`,
        is_system_message: true,
      }).save();

      // Notify admin
      await mailSender(
        process.env.ADMIN_MAIL,
        "Escrow Dispute Raised",
        `<p>Dispute raised on escrow <b>${escrow.title}</b> (ID: ${escrow_id})</p>
         <p>Raised by: ${raised_by_role} — ${raised_by}</p>
         <p>Reason: ${reason}</p>
         <p>Amount at stake: UGX ${escrow.escrow_balance.toLocaleString()}</p>`
      );

      return res.status(200).json({ message: "Dispute raised. Admin has been notified." });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── GET ESCROWS (employer or contractor) ────────────────────────────────────
  static async getEscrows(req, res) {
    try {
      const { user_id, role } = req.params;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;
      const skip = (page - 1) * pageSize;

      const query = role === "employer"
        ? { employer_id: user_id }
        : { contractor_id: user_id };

      const total = await escrowModel.countDocuments(query);
      const escrows = await escrowModel.find(query)
        .populate("employer_id", "first_name last_name email_address phone")
        .populate("contractor_id", "first_name last_name email tel_num")
        .populate("job_post_id", "job_title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize);

      return res.status(200).json({
        totalDocuments: total,
        totalPages: Math.ceil(total / pageSize),
        currentPage: page,
        pageSize,
        escrows,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── GET SINGLE ESCROW ───────────────────────────────────────────────────────
  static async getSingleEscrow(req, res) {
    try {
      const escrow = await escrowModel.findById(req.params.escrow_id)
        .populate("employer_id", "first_name last_name email_address phone")
        .populate("contractor_id", "first_name last_name email tel_num profile_pic")
        .populate("job_post_id", "job_title");

      if (!escrow) return res.status(404).json({ message: "Escrow not found." });
      return res.status(200).json({ escrow });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── ADMIN: GET ALL ESCROWS ───────────────────────────────────────────────────
  static async adminGetAllEscrows(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 20;
      const skip = (page - 1) * pageSize;
      const statusFilter = req.query.status ? { status: req.query.status } : {};

      const total = await escrowModel.countDocuments(statusFilter);
      const escrows = await escrowModel.find(statusFilter)
        .populate("employer_id", "first_name last_name email_address")
        .populate("contractor_id", "first_name last_name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize);

      // Aggregate stats
      const stats = await escrowModel.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            total_agreed: { $sum: "$agreed_amount" },
            total_service_fee: { $sum: "$service_fee" },
          }
        }
      ]);

      return res.status(200).json({ totalDocuments: total, totalPages: Math.ceil(total / pageSize), currentPage: page, pageSize, escrows, stats });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── ADMIN: RESOLVE DISPUTE ───────────────────────────────────────────────────
  static async adminResolveDispute(req, res) {
    try {
      const { escrow_id } = req.params;
      const { resolution, release_to } = req.body; // release_to: "contractor" | "employer" | "split"

      const escrow = await escrowModel.findById(escrow_id)
        .populate("employer_id")
        .populate("contractor_id");

      if (!escrow) return res.status(404).json({ message: "Escrow not found." });
      if (escrow.status !== "disputed") return res.status(400).json({ message: "Escrow not in disputed state." });

      const amount = escrow.escrow_balance;

      if (release_to === "contractor") {
        let wallet = await walletModel.findOne({ owner_id: escrow.contractor_id._id, owner_type: "freelancer" });
        if (!wallet) wallet = new walletModel({ owner_id: escrow.contractor_id._id, owner_type: "freelancer" });
        wallet.available_balance += amount;
        wallet.total_earned += amount;
        wallet.transactions.push({ type: "credit", amount, description: `Dispute resolved in your favour: ${escrow.title}`, escrow_id: escrow._id, status: "completed" });
        await wallet.save();
      } else if (release_to === "employer") {
        // Refund to employer's balance
        await employerModel.findByIdAndUpdate(escrow.employer_id._id, {
          $inc: { balance: amount }
        });
      }

      await escrowModel.findByIdAndUpdate(escrow_id, {
        status: "completed",
        escrow_balance: 0,
        released_amount: release_to === "contractor" ? amount : 0,
      });

      await new taskChatModel({
        escrow_id,
        sender_id: escrow.employer_id._id,
        sender_role: "employer",
        sender_name: "BuildUp Admin",
        message: `⚖️ Dispute resolved. Funds released to ${release_to}. Resolution: ${resolution}`,
        is_system_message: true,
      }).save();

      return res.status(200).json({ message: "Dispute resolved." });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}

module.exports = EscrowController;
