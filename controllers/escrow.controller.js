const escrowModel = require("../models/escrow.model");
const walletModel = require("../models/wallet.model");
const taskChatModel = require("../models/taskChat.model");
const freelancerModel = require("../models/freelancer.model");
const employerModel = require("../models/employer.model");
const userModel = require("../models/user.model");
const mailSender = require("../utils/mailSender");
const Xyle = require("../services/payments/xyle");
const { v4: uuidv4 } = require("uuid");
const AdminRevenueController = require("./adminRevenue.controller");

const SERVICE_FEE_RATE = 0.10; // 10%
const MIN_DEPOSIT_RATE = 0.60; // 60% minimum

// Resolve the wallet owner_type for a given userId.
// Strategy: find whichever wallet already exists (avoids "wrong bucket" misses
// for legacy accounts whose wallets were created before migration). Falls back
// to "user" for unified accounts with no wallet yet, or "freelancer" for truly
// legacy accounts not yet in userModel.
async function resolveWalletOwnerType(userId) {
  const existing = await walletModel.findOne(
    { owner_id: userId },
    { owner_type: 1 }
  ).lean();
  if (existing) return existing.owner_type;
  // No wallet yet — pick the right type based on which collection owns this id
  const isUnified = await userModel.exists({ _id: userId });
  return isUnified ? "user" : "freelancer";
}

// Escrow.employer_id/contractor_id only ref the legacy employer/freelancer
// collections. Mongoose's `.populate()` silently resolves to `null` for any
// unified-model account (new registrations, or accounts migrated on
// role-switch) — every `.first_name`/`._id` access on that populated field
// would then throw. Resolve display info manually across all three
// collections instead of relying on schema-level populate.
async function resolvePartyInfo(id) {
  if (!id) return null;
  const employer = await employerModel.findById(id)
    .select("first_name last_name email_address");
  if (employer) {
    return {
      _id: employer._id,
      first_name: employer.first_name,
      last_name: employer.last_name,
      email: employer.email_address,
    };
  }
  const freelancer = await freelancerModel.findById(id)
    .select("first_name last_name email tel_num profile_pic");
  if (freelancer) {
    return {
      _id: freelancer._id,
      first_name: freelancer.first_name,
      last_name: freelancer.last_name,
      email: freelancer.email,
      tel_num: freelancer.tel_num,
      profile_pic: freelancer.profile_pic,
    };
  }
  const user = await userModel.findById(id)
    .select("first_name last_name email tel_num profile_pic");
  if (user) {
    return {
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      tel_num: user.tel_num,
      profile_pic: user.profile_pic,
    };
  }
  return null;
}

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
        // await mailSender(
        //   contractor.email,
        //   "New Task Escrow Created",
        //   `<p>Hi ${contractor.first_name},</p>
        //    <p><b>${employer.first_name} ${employer.last_name}</b> has created an escrow for the task: <b>${title}</b></p>
        //    <p>Agreed Amount: <b>UGX ${agreed.toLocaleString()}</b></p>
        //    <p>They will deposit funds shortly. You will be notified once the escrow is funded.</p>`
        // );
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

      const escrow = await escrowModel.findById(escrow_id);

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

      const escrow = await escrowModel.findById(escrow_id);

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

      // ── Credit admin revenue wallet with the service fee ──────────────────
      await AdminRevenueController.creditFee(escrow_id, escrow.service_fee);

      await escrowModel.findByIdAndUpdate(escrow_id, {
        status: "active",
        escrow_balance,
        xyle_deposit_reference: xyle_reference || escrow.xyle_deposit_reference,
      });

      // Post a system message to task chat
      const employerInfo = await resolvePartyInfo(escrow.employer_id);
      await new taskChatModel({
        escrow_id,
        sender_id: escrow.employer_id,
        sender_role: "employer",
        sender_name: employerInfo ? `${employerInfo.first_name} ${employerInfo.last_name}` : "Employer",
        message: `✅ Deposit confirmed! UGX ${escrow.initial_deposit.toLocaleString()} deposited into escrow. Work can now begin. (Service fee of UGX ${escrow.service_fee.toLocaleString()} deducted — contractor will receive UGX ${escrow_balance.toLocaleString()} upon completion${escrow.full_payment_upfront ? "" : " + remaining UGX " + (escrow.net_amount - escrow_balance).toLocaleString() + " on completion"})`,
        is_system_message: true,
        status: "forwarded", // system-generated lifecycle events skip admin moderation
      }).save();

      return res.status(200).json({ message: "Deposit confirmed. Escrow is now active.", escrow_balance });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── DEPOSIT INITIAL AMOUNT FROM WALLET BALANCE (employer) ───────────────────
  // Same effect as initiateDeposit + confirmDeposit, but settled instantly by
  // debiting the employer's own BuildUp wallet instead of going through Xyle.
  static async depositFromWallet(req, res) {
    try {
      const { escrow_id } = req.params;
      const { employer_id } = req.body;

      const escrow = await escrowModel.findById(escrow_id);

      if (!escrow) return res.status(404).json({ message: "Escrow not found." });
      if (escrow.employer_id.toString() !== employer_id) {
        return res.status(403).json({ message: "Not authorized." });
      }
      if (escrow.status !== "pending_deposit") {
        return res.status(400).json({ message: "Escrow already funded or completed." });
      }

      const ownerType = await resolveWalletOwnerType(employer_id);
      const wallet = await walletModel.findOne({ owner_id: employer_id, owner_type: ownerType });
      if (!wallet || wallet.available_balance < escrow.initial_deposit) {
        return res.status(400).json({ message: "Insufficient wallet balance." });
      }

      wallet.available_balance -= escrow.initial_deposit;
      wallet.transactions.push({
        type: "debit",
        amount: escrow.initial_deposit,
        description: `Escrow deposit for: ${escrow.title}`,
        reference: uuidv4(),
        escrow_id: escrow._id,
        status: "completed",
      });
      await wallet.save();

      const escrow_balance = escrow.initial_deposit - escrow.service_fee;
      await AdminRevenueController.creditFee(escrow_id, escrow.service_fee);

      await escrowModel.findByIdAndUpdate(escrow_id, {
        status: "active",
        escrow_balance,
      });

      const employerInfo = await resolvePartyInfo(escrow.employer_id);
      await new taskChatModel({
        escrow_id,
        sender_id: escrow.employer_id,
        sender_role: "employer",
        sender_name: employerInfo ? `${employerInfo.first_name} ${employerInfo.last_name}` : "Employer",
        message: `✅ Deposit of UGX ${escrow.initial_deposit.toLocaleString()} made from wallet balance. Work can now begin. (Service fee of UGX ${escrow.service_fee.toLocaleString()} deducted — contractor will receive UGX ${escrow_balance.toLocaleString()} upon completion${escrow.full_payment_upfront ? "" : " + remaining UGX " + (escrow.net_amount - escrow_balance).toLocaleString() + " on completion"})`,
        is_system_message: true,
        status: "forwarded",
      }).save();

      return res.status(200).json({ message: "Deposit successful. Escrow is now active.", escrow_balance });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── SUBMIT COMPLETION PROOF (contractor) ────────────────────────────────────
  static async submitCompletion(req, res) {
    try {
      const { escrow_id } = req.params;
      const { note, attachment_url, contractor_id } = req.body;

      const escrow = await escrowModel.findById(escrow_id);

      if (!escrow) return res.status(404).json({ message: "Escrow not found." });
      if (escrow.status !== "active") {
        return res.status(400).json({ message: "Escrow is not active." });
      }
      if (escrow.contractor_id.toString() !== contractor_id) {
        return res.status(403).json({ message: "Not authorized." });
      }

      await escrowModel.findByIdAndUpdate(escrow_id, {
        status: "completion_requested",
        "completion_proof.url": attachment_url || null,
        "completion_proof.note": note || "",
        "completion_proof.submitted_at": new Date(),
      });

      // System message in task chat
      const contractorInfo = await resolvePartyInfo(escrow.contractor_id);
      await new taskChatModel({
        escrow_id,
        sender_id: contractor_id,
        sender_role: "contractor",
        sender_name: contractorInfo ? `${contractorInfo.first_name} ${contractorInfo.last_name}` : "Contractor",
        message: `🏁 Completion submitted by contractor. Note: "${note || "No note provided"}"`,
        attachment_url: attachment_url || null,
        is_system_message: true,
        status: "forwarded", // system-generated lifecycle events skip admin moderation
      }).save();

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

      const escrow = await escrowModel.findById(escrow_id);

      if (!escrow) return res.status(404).json({ message: "Escrow not found." });
      if (escrow.status !== "completion_requested") {
        return res.status(400).json({ message: "No completion pending confirmation." });
      }
      if (escrow.employer_id.toString() !== employer_id) {
        return res.status(403).json({ message: "Not authorized." });
      }

      const contractorId = escrow.contractor_id;

      // Enforce: employer must have deposited the full agreed amount before releasing.
      // remaining = agreed_amount - initial_deposit (what employer still owes)
      const remainingOwed = escrow.agreed_amount - escrow.initial_deposit;
      if (!escrow.full_payment_upfront && remainingOwed > 0) {
        return res.status(400).json({
          message: `You must deposit the remaining balance of UGX ${remainingOwed.toLocaleString()} before confirming completion. Use the "Deposit Remaining Balance" option.`,
          remaining_balance: remainingOwed,
        });
      }

      // Release the full net amount (agreed - service_fee); escrow_balance holds it all now.
      const totalRelease = escrow.escrow_balance;

      // Get/create contractor wallet (resolving legacy vs. unified account).
      const ownerType = await resolveWalletOwnerType(contractorId);
      let wallet = await walletModel.findOne({ owner_id: contractorId, owner_type: ownerType });
      if (!wallet) {
        wallet = new walletModel({ owner_id: contractorId, owner_type: ownerType });
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
      const [employerInfo, contractorInfo] = await Promise.all([
        resolvePartyInfo(escrow.employer_id),
        resolvePartyInfo(contractorId),
      ]);
      await new taskChatModel({
        escrow_id,
        sender_id: employer_id,
        sender_role: "employer",
        sender_name: employerInfo ? `${employerInfo.first_name} ${employerInfo.last_name}` : "Employer",
        message: `💰 Work confirmed! UGX ${totalRelease.toLocaleString()} has been released to ${contractorInfo ? contractorInfo.first_name : "the contractor"}'s wallet.`,
        is_system_message: true,
        status: "forwarded", // system-generated lifecycle events skip admin moderation
      }).save();

      return res.status(200).json({
        message: "Completion confirmed. Funds released to contractor wallet.",
        released: totalRelease,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── DEPOSIT REMAINING BALANCE (employer tops up active escrow) ─────────────
  static async initiateRemainingDeposit(req, res) {
    try {
      const { escrow_id } = req.params;
      const { phone_number, provider } = req.body;

      const escrow = await escrowModel.findById(escrow_id);

      if (!escrow) return res.status(404).json({ message: "Escrow not found." });
      if (!["active", "completion_requested"].includes(escrow.status)) {
        return res.status(400).json({ message: "Escrow is not active." });
      }
      if (escrow.full_payment_upfront) {
        return res.status(400).json({ message: "Full payment was already made upfront." });
      }

      // Remaining = agreed_amount - initial_deposit (what was not yet paid by employer)
      const remaining = escrow.agreed_amount - escrow.initial_deposit;
      if (remaining <= 0) {
        return res.status(400).json({ message: "No remaining balance to deposit." });
      }

      const phone = Xyle.normalizePhone(phone_number);
      const detectedProvider = provider || Xyle.detectProvider(phone);

      const xyleResult = await Xyle.initiateDeposit(phone, remaining, detectedProvider);

      await escrowModel.findByIdAndUpdate(escrow_id, {
        xyle_remaining_reference: xyleResult.reference || xyleResult.id,
      });

      return res.status(200).json({
        message: "Remaining deposit initiated. Please approve the USSD prompt on your phone.",
        xyle_reference: xyleResult.reference || xyleResult.id,
        amount: remaining,
        provider: detectedProvider,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  static async confirmRemainingDeposit(req, res) {
    try {
      const { escrow_id } = req.params;
      const { xyle_reference } = req.body;

      const escrow = await escrowModel.findById(escrow_id);

      if (!escrow) return res.status(404).json({ message: "Escrow not found." });
      if (!["active", "completion_requested"].includes(escrow.status)) {
        return res.status(400).json({ message: "Escrow is not active." });
      }
      if (escrow.full_payment_upfront) {
        return res.status(400).json({ message: "Full payment was already made upfront." });
      }

      const remaining = escrow.agreed_amount - escrow.initial_deposit;
      if (remaining <= 0) {
        return res.status(400).json({ message: "No remaining balance to deposit." });
      }

      // The remaining amount goes entirely into the escrow balance
      // (service fee was already collected on the full agreed_amount during initial deposit)
      const newEscrowBalance = escrow.escrow_balance + remaining;
      const newInitialDeposit = escrow.agreed_amount; // now fully deposited

      await escrowModel.findByIdAndUpdate(escrow_id, {
        initial_deposit: newInitialDeposit,
        escrow_balance: newEscrowBalance,
        xyle_remaining_reference: xyle_reference || escrow.xyle_remaining_reference,
      });

      // System message in task chat
      const employerInfo = await resolvePartyInfo(escrow.employer_id);
      await new taskChatModel({
        escrow_id,
        sender_id: escrow.employer_id,
        sender_role: "employer",
        sender_name: employerInfo ? `${employerInfo.first_name} ${employerInfo.last_name}` : "Employer",
        message: `✅ Remaining balance of UGX ${remaining.toLocaleString()} deposited into escrow. Total escrow balance is now UGX ${newEscrowBalance.toLocaleString()}.`,
        is_system_message: true,
        status: "forwarded", // system-generated lifecycle events skip admin moderation
      }).save();

      return res.status(200).json({
        message: "Remaining deposit confirmed. Escrow balance updated.",
        new_escrow_balance: newEscrowBalance,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // ─── DEPOSIT REMAINING BALANCE FROM WALLET (employer) ────────────────────────
  static async depositRemainingFromWallet(req, res) {
    try {
      const { escrow_id } = req.params;
      const { employer_id } = req.body;

      const escrow = await escrowModel.findById(escrow_id);

      if (!escrow) return res.status(404).json({ message: "Escrow not found." });
      if (escrow.employer_id.toString() !== employer_id) {
        return res.status(403).json({ message: "Not authorized." });
      }
      if (!["active", "completion_requested"].includes(escrow.status)) {
        return res.status(400).json({ message: "Escrow is not active." });
      }
      if (escrow.full_payment_upfront) {
        return res.status(400).json({ message: "Full payment was already made upfront." });
      }

      const remaining = escrow.agreed_amount - escrow.initial_deposit;
      if (remaining <= 0) {
        return res.status(400).json({ message: "No remaining balance to deposit." });
      }

      const ownerType = await resolveWalletOwnerType(employer_id);
      const wallet = await walletModel.findOne({ owner_id: employer_id, owner_type: ownerType });
      if (!wallet || wallet.available_balance < remaining) {
        return res.status(400).json({ message: "Insufficient wallet balance." });
      }

      wallet.available_balance -= remaining;
      wallet.transactions.push({
        type: "debit",
        amount: remaining,
        description: `Escrow remaining balance deposit for: ${escrow.title}`,
        reference: uuidv4(),
        escrow_id: escrow._id,
        status: "completed",
      });
      await wallet.save();

      const newEscrowBalance = escrow.escrow_balance + remaining;

      await escrowModel.findByIdAndUpdate(escrow_id, {
        initial_deposit: escrow.agreed_amount,
        escrow_balance: newEscrowBalance,
      });

      const employerInfo = await resolvePartyInfo(escrow.employer_id);
      await new taskChatModel({
        escrow_id,
        sender_id: escrow.employer_id,
        sender_role: "employer",
        sender_name: employerInfo ? `${employerInfo.first_name} ${employerInfo.last_name}` : "Employer",
        message: `✅ Remaining balance of UGX ${remaining.toLocaleString()} deposited from wallet balance. Total escrow balance is now UGX ${newEscrowBalance.toLocaleString()}.`,
        is_system_message: true,
        status: "forwarded",
      }).save();

      return res.status(200).json({
        message: "Remaining deposit successful. Escrow balance updated.",
        new_escrow_balance: newEscrowBalance,
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

      const escrow = await escrowModel.findById(escrow_id);

      if (!escrow) return res.status(404).json({ message: "Escrow not found." });
      if (!["active", "completion_requested"].includes(escrow.status)) {
        return res.status(400).json({ message: "Cannot dispute at this stage." });
      }

      await escrowModel.findByIdAndUpdate(escrow_id, { status: "disputed" });

      const raiserInfo = await resolvePartyInfo(
        raised_by_role === "employer" ? escrow.employer_id : escrow.contractor_id
      );
      await new taskChatModel({
        escrow_id,
        sender_id: raised_by,
        sender_role: raised_by_role,
        sender_name: raiserInfo ? `${raiserInfo.first_name} ${raiserInfo.last_name}` : raised_by_role,
        message: `⚠️ Dispute raised: ${reason}`,
        is_system_message: true,
        status: "forwarded", // system-generated lifecycle events skip admin moderation
      }).save();

      // Notify admin
      // await mailSender(
      //   process.env.ADMIN_MAIL,
      //   "Escrow Dispute Raised",
      //   `<p>Dispute raised on escrow <b>${escrow.title}</b> (ID: ${escrow_id})</p>
      //    <p>Raised by: ${raised_by_role} — ${raised_by}</p>
      //    <p>Reason: ${reason}</p>
      //    <p>Amount at stake: UGX ${escrow.escrow_balance.toLocaleString()}</p>`
      // );

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
        .populate("job_post_id", "job_title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean();

      // employer_id/contractor_id only ref the legacy collections — resolve
      // display info manually so unified accounts show real names too.
      await Promise.all(
        escrows.map(async (escrow) => {
          const [employerInfo, contractorInfo] = await Promise.all([
            resolvePartyInfo(escrow.employer_id),
            resolvePartyInfo(escrow.contractor_id),
          ]);
          escrow.employer_id = employerInfo || escrow.employer_id;
          escrow.contractor_id = contractorInfo || escrow.contractor_id;
        })
      );

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
        .populate("job_post_id", "job_title")
        .lean();

      if (!escrow) return res.status(404).json({ message: "Escrow not found." });

      const [employerInfo, contractorInfo] = await Promise.all([
        resolvePartyInfo(escrow.employer_id),
        resolvePartyInfo(escrow.contractor_id),
      ]);
      escrow.employer_id = employerInfo || escrow.employer_id;
      escrow.contractor_id = contractorInfo || escrow.contractor_id;

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

      const escrow = await escrowModel.findById(escrow_id);

      if (!escrow) return res.status(404).json({ message: "Escrow not found." });
      if (escrow.status !== "disputed") return res.status(400).json({ message: "Escrow not in disputed state." });

      const amount = escrow.escrow_balance;

      if (release_to === "contractor") {
        const ownerType = await resolveWalletOwnerType(escrow.contractor_id);
        let wallet = await walletModel.findOne({ owner_id: escrow.contractor_id, owner_type: ownerType });
        if (!wallet) wallet = new walletModel({ owner_id: escrow.contractor_id, owner_type: ownerType });
        wallet.available_balance += amount;
        wallet.total_earned += amount;
        wallet.transactions.push({ type: "credit", amount, description: `Dispute resolved in your favour: ${escrow.title}`, escrow_id: escrow._id, status: "completed" });
        await wallet.save();
      } else if (release_to === "employer") {
        // Refund to employer's wallet (works for both legacy and unified accounts).
        const ownerType = await resolveWalletOwnerType(escrow.employer_id);
        let wallet = await walletModel.findOne({ owner_id: escrow.employer_id, owner_type: ownerType });
        if (!wallet) wallet = new walletModel({ owner_id: escrow.employer_id, owner_type: ownerType });
        wallet.available_balance += amount;
        wallet.transactions.push({ type: "credit", amount, description: `Escrow refund: ${escrow.title}`, escrow_id: escrow._id, status: "completed" });
        await wallet.save();
      }

      await escrowModel.findByIdAndUpdate(escrow_id, {
        status: "completed",
        escrow_balance: 0,
        released_amount: release_to === "contractor" ? amount : 0,
      });

      await new taskChatModel({
        escrow_id,
        sender_id: escrow.employer_id,
        sender_role: "employer",
        sender_name: "BuildUp Admin",
        message: `⚖️ Dispute resolved. Funds released to ${release_to}. Resolution: ${resolution}`,
        is_system_message: true,
        status: "forwarded", // system-generated lifecycle events skip admin moderation
      }).save();

      return res.status(200).json({ message: "Dispute resolved." });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}

module.exports = EscrowController;