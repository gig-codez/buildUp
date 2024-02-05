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
const router = express.Router();

router.patch("/admin/profession", ContractorProfessionController.update);
router.patch("/admin/:id", AdminController.update);
router.patch("/supplier_deals/:id", SupplierController.update_deals);
//freelancer update
router.patch("/contractor/:id", FreelancerController.update);
router.patch(
  "/contractor-profile/:id/:name",
  docUploader("image"),
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
module.exports = router;
