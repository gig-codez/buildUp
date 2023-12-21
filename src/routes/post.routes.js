const express = require("express");
const AdminController = require("../controllers/admin.controller");
const AdminLogin = require("../Auth/adminLogin");
const FreelancerController = require("../controllers/freelancer.controller");
const jobscontroller = require("../controllers/jobs.controller.js");
const FreelancerLogin = require("../Auth/freelancerLogin");
const imageUpload = require("../helpers/imageUpload");
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
const router = express.Router();
// account verification
router.post("/verifyEmail", AccountVerification.verifyEmail);
//admin Routes4
router.post("/create/admin", AdminController.store);
router.post("/login/admin", AdminLogin.login);
router.post("/add/role", RoleController.store);
// freelancer routes
router.post(
  "/create/freelancer",
  imageUpload("uploads/images"),
  FreelancerController.store
);
router.post("/login/freelancer", FreelancerLogin.login);
//employer account
router.post("/login/employer", employerlogin.login);
router.post("/create/employer", EmployerController.storeEmployer);
//business of employer
router.post("/create/business/:id", BusinessController.store);
//supplier
router.post("/create/supplier", SupplierController.store);
router.post("/login/supplier", SupplierLogin.login);
//otp
router.post("/send-otp", OtpController.sendOTP);

router.post("/verifyOtp", VerifyOtp.verify);

//forgotpassword
router.post("/forgotPassword", Password.forgotPassword);

//
router.post("/addJob/:employerId", jobscontroller.addJobs);

module.exports = router;
