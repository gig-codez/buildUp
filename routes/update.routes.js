const express = require("express");
const EmployerController = require("../controllers/employer.controller");
const AdminController = require("../controllers/admin.controller");
const BusinessController = require("../controllers/business.controller");
const SupplierController = require("../controllers/supplier.controller");
const FreelancerController = require("../controllers/freelancer.controller");
const ContractorProfessionController = require("../controllers/contractorProfession.controller");
const Password = require("../Auth/userpassword");
const docUploader = require("../helpers/uploadManager");
const MeetingController = require("../controllers/meetings.controller");
const UserController = require("../controllers/user.controller");
const uploader = require("../helpers/uploadManager");
const router = express.Router();

router.patch("/admin/profession", ContractorProfessionController.update);
router.patch("/admin/:id", AdminController.update);
router.patch("/supplier_deals/:id", SupplierController.update_deals);
//freelancer update
router.patch("/contractor/:id", FreelancerController.update);
router.patch(
  "/contractor-profile/:id",
  docUploader().single("image"),
  FreelancerController.update_contractor_profile
);
//employer update
router.patch("/employer/:id", EmployerController.update);
//update business
router.patch("/business/:id", BusinessController.updateBusiness);
//update supplier
router.patch("/suppliers/:id", SupplierController.update);

router.patch("/resetpassword/:token", Password.resetPassword);
// meetings
router.patch("/meetings/:id", MeetingController.update);
// password routes
router.patch("/employer/password/:id", EmployerController.updatePassword);
router.patch("/supplier/password/:id", SupplierController.updatePassword);

// profile picture updates
router.patch("/profile-picture/user/:id", uploader().single("image"), UserController.update_profile_picture);
router.patch("/profile-picture/employer/:id", uploader().single("image"), EmployerController.update_profile_picture);
router.patch("/profile-picture/supplier/:id", uploader().single("image"), SupplierController.update_profile_picture);
router.patch("/profile-picture/contractor/:id", uploader().single("image"), FreelancerController.update_profile_picture);

module.exports = router;
