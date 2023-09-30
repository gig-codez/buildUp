const express = require("express");
const AdminController = require("../controllers/admin.controller");
const AdminLogin = require("../Auth/adminLogin");
const FreelancerController = require("../controllers/freelancer.controller");
const FreelancerLogin = require("../Auth/freelancerLogin");
const imageUpload = require("../helpers/imageUpload");
const AccountVerification = require("../Auth/emailVerification");
const router = express.Router();

// accout verification
router.post('/verifyEmail', AccountVerification.verifyEmail);
//admin Routes
router.post("/create/admin", AdminController.store);
router.post("/login/admin", AdminLogin.login);
// freelancer routes
router.post("/create/freelancer",imageUpload("uploads/images"), FreelancerController.store);
router.post("/login/freelancer", FreelancerLogin.login);

module.exports = router;
