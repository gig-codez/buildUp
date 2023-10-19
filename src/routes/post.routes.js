const express = require("express");
const AdminController = require("../controllers/admin.controller");
const AdminLogin = require("../Auth/adminLogin");
const FreelancerController = require("../controllers/freelancer.controller");
const FreelancerLogin = require("../Auth/freelancerLogin");
// const EmployerController = require("../controllers/employer.controller");
const imageUpload = require("../helpers/imageUpload");
const AccountVerification = require("../Auth/emailVerification");
const RoleController = require("../controllers/role.controller");
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

module.exports = router;
