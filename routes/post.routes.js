const express = require("express");
const FreelancerController = require("../controllers/freelancer.controller");
const jobscontroller = require("../controllers/jobs.controller.js");
const FreelancerLogin = require("../Auth/freelancerLogin");
const AccountVerification = require("../Auth/emailVerification");
const RoleController = require("../controllers/role.controller");
const EmployerController = require("../controllers/employer.controller");
const BusinessController = require("../controllers/business.controller");
const SupplierController = require("../controllers/supplier.controller");
const employerlogin = require("../Auth/employerlogin");
const SupplierLogin = require("../Auth/supplierlogin");
const OtpController = require("../controllers/otpController");
const VerifyOtp = require("../Auth/verifyotp");
const Password = require("../Auth/userpassword");
const uploadManager = require("../helpers/uploadManager.js");
const multer = require("multer");
const MeetingController = require("../controllers/meetings.controller");
const MailController = require("../controllers/mail.controller.js");
const MessageController = require("../controllers/message.controller");
const UserController = require("../controllers/user.controller");

const router = express.Router();

// CV/resume upload: optional file, max 5MB
const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed for resume/CV"), false);
    }
  },
});

// account verification
router.post("/verifyEmail", AccountVerification.verifyEmail);

router.post("/add/role", RoleController.store);

// freelancer routes
router.post("/create/freelancer", FreelancerController.store);
router.post("/login/freelancer", FreelancerLogin.login);
router.post("/login/consultant", FreelancerLogin.consultant_login);

// apply for a job — resume is OPTIONAL (max 5MB PDF)
router.post(
  "/applied-jobs/add",
  (req, res, next) => {
    resumeUpload.single("document")(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Resume file is too large. Maximum allowed size is 5MB.",
        });
      }
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  jobscontroller.store_applied_jobs
);

// employer account
router.post("/login/employer", employerlogin.login);
router.post("/create/employer", EmployerController.storeEmployer);

// business of employer
router.post("/create/business/:id", BusinessController.store);

// supplier
router.post("/create/supplier", SupplierController.store);
router.post("/login/supplier", SupplierLogin.login);

// supplier deals
router.post("/deals/add", SupplierController.create_deals);

// otp
router.post("/send-otp", OtpController.sendOTP);
router.post("/verifyOtp", VerifyOtp.verify);
router.post("/verify-otp", OtpController.verifyOtp);
router.post("/resend-otp", OtpController.sendOTP);
router.post("/resend-email", OtpController.sendEmailVerification);

// password
router.post("/forgotPassword", Password.forgotPassword);
router.post("/forgot-password", OtpController.forgotPassword);

// jobs
router.post("/addJob/:employerId", jobscontroller.addJobs);
router.post("/job/:employerId", jobscontroller.addJobs);

// meetings
router.post("/meetings/add", MeetingController.store);

// mail
router.post("/send-mail", MailController.send_mail);

// messages
router.post("/message", MessageController.storeMessage);
router.post("/message/file", uploadManager().single("file"), MessageController.storeFile);

// search
router.post("/search-users", UserController.searchUsersByRolesRequest);

module.exports = router;