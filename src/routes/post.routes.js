const express = require("express");
const AdminController = require("../controllers/admin.controller");
const AdminLogin = require("../Auth/adminLogin");
const FreelancerController = require("../controllers/freelancer.controller");
const FreelancerLogin = require("../Auth/freelancerLogin");
const EmployerController = require("../controllers/employer.controller");
const imageUpload = require("../helpers/imageUpload");
const AccountVerification = require("../Auth/emailVerification");
const router = express.Router();

// account verification
router.post("/verifyEmail", AccountVerification.verifyEmail);
//employer Routes
router.post("/create/employer", EmployerController.store);
//admin Routes4
router.post("/create/admin", AdminController.store);
router.post("/login/admin", AdminLogin.login);
// freelancer routes
router.post(
  "/create/freelancer",
  imageUpload("uploads/images"),
  FreelancerController.store
);
router.post("/login/freelancer", FreelancerLogin.login);

module.exports = router;
