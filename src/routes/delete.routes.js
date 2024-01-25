const express = require("express");
const AdminController = require("../controllers/admin.controller");
const EmployerController = require("../controllers/employer.controller");
const BusinessController = require("../controllers/business.controller");
const SupplierController = require("../controllers/supplier.controller");
const FreelancerController = require("../controllers/freelancer.controller");
const ContractorProfessionController = require("../controllers/contractorProfession.controller");
const JobsController = require("../controllers/jobs.controller");
const MeetingController = require("../controllers/meetings.controller");
const ShortListedController = require("../controllers/shortlisted.controller");
const router = express.Router();

router.delete("/admin/:id", AdminController.delete);
router.delete("/admin/profession/:id", ContractorProfessionController.delete);

//delete freelancer
router.delete("/freelancer/:id", FreelancerController.delete);
//delete employer
// router.delete("/employer/:id", EmployerController.delete);
//delete business
router.delete("/business/:id", BusinessController.deleteBusiness);
//delete supplier
router.delete("/suppliers/:id", SupplierController.delete);

// applied jobs
router.delete("/delete-applied-jobs/:id", JobsController.delete_applied_jobs);
router.delete("/delete-prof-jobs/:id", JobsController.delete_prof_jobs);
// meetings
router.delete("/meetings/:id", MeetingController.delete);
// shorlisted
router.delete("/shortlisted/:id", ShortListedController.delete);
// deeals
router.delete("/deals/:id", SupplierController.delete_deals);
module.exports = router;
