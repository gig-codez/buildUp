const express = require("express");
const AdminController = require("../controllers/admin.controller");
const AdminLogin = require("../Auth/adminLogin");
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
const ContractorProfessionController = require("../controllers/contractorProfession.controller");
const OtpController = require("../controllers/otpController");
const VerifyOtp = require("../Auth/verifyotp");
const Password = require("../Auth/userpassword");
const SupplierTypeController = require("../controllers/supplierType.controller");
const uploadManager = require("../helpers/uploadManager.js");
const MeetingController = require("../controllers/meetings.controller");
const MailController = require("../controllers/mail.controller.js");
const MessageController = require("../controllers/message.controller");
const UserController = require("../controllers/user.controller");

const router = express.Router();
// account verification
router.post("/verifyEmail", AccountVerification.verifyEmail);
//admin Routes4
router.post("/create/admin", AdminController.store);
router.post("/login/admin", AdminLogin.login);
router.post("/add/role", RoleController.store);
// freelancer routes
router.post(
  "/create/freelancer/:name",
  uploadManager("images"),
  FreelancerController.store
);

router.post("/admin/profession", ContractorProfessionController.store);
router.post("/admin/supplier-type", SupplierTypeController.store);

router.post("/login/freelancer", FreelancerLogin.login);
router.post(
  "/applied-jobs/add/:name",
  uploadManager("document", "docs"),
  jobscontroller.store_applied_jobs
);

//employer account
router.post("/login/employer", employerlogin.login);
router.post("/create/employer", EmployerController.storeEmployer);
//business of employer
router.post("/create/business/:id", BusinessController.store);
//supplier
router.post("/create/supplier", SupplierController.store);
router.post("/login/supplier", SupplierLogin.login);
// supplier deals
router.post("/deals/add", SupplierController.create_deals);
//otp
router.post("/send-otp", OtpController.sendOTP);

router.post("/verifyOtp", VerifyOtp.verify);

//forgotpassword
router.post("/forgotPassword", Password.forgotPassword);

router.post("/addJob/:employerId", jobscontroller.addJobs);
router.post("/job/:employerId", jobscontroller.addJobs);
// meetings
router.post("/meetings/add", MeetingController.store);
// send mail
router.post("/send-mail", MailController.send_mail);
router.post("/message", MessageController.storeMessage)
router.post("/search-users", UserController.searchUsersByRolesRequest)
module.exports = router;
