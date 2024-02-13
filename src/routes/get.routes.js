const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/admin.controller");
const AccountVerification = require("../Auth/emailVerification");
const EmployerController = require("../controllers/employer.controller");
const RoleController = require("../controllers/role.controller");
const BusinessController = require("../controllers/business.controller");
const SupplierController = require("../controllers/supplier.controller");
const FreelancerController = require("../controllers/freelancer.controller");
const ContractorProfessionController = require("../controllers/contractorProfession.controller");
const SupplierTypeController = require("../controllers/supplierType.controller");
const jobscontroller = require("../controllers/jobs.controller");
const JobsController = require("../controllers/jobs.controller");
const MeetingController = require("../controllers/meetings.controller");
const ShortListedController = require("../controllers/shortlisted.controller");
const MessageController = require("../controllers/message.controller");
const UserController = require("../controllers/user.controller");
// routes to fetch system users except employers and admins
router.get("/allUsers", UserController.get_users);
router.get("/admin", AdminController.index);
router.get("/verifyToken/:id", AccountVerification.verifyToken);
router.get("/roles", RoleController.index);
//freelancers
router.get("/contractors", FreelancerController.index);
router.get("/contractor/:id", FreelancerController.show);
router.get(
  "/contractor-applied-jobs/:contractor_id",
  JobsController.contractor_applied_jobs
);

//employers
router.get("/employers", EmployerController.getAll);
router.get("/employer/:id", EmployerController.getEmployerById);
router.get("/client-jobs/:client_id", JobsController.client_jobs);
//business
router.get("/business", BusinessController.getAll);
router.get("/business/:id", BusinessController.getBusinessById);
//suppliers
router.get("/suppliers", SupplierController.getAll);
router.get("/supplier/:id", SupplierController.show);
router.get("/deals", SupplierController.deals);
// deals by category
router.get("/deals/:id", SupplierController.deals_by_category);
router.get("/admin/profession", ContractorProfessionController.index);
router.get("/profession/:id", ContractorProfessionController.findProfById);
router.get("/admin/supplier-type", SupplierTypeController.index);
router.get("/jobs", jobscontroller.get_all_jobs);
router.get(
  "/profession-jobs/:professionId",
  jobscontroller.getJobsByProfession
);

router.get("/employer-jobs/:employerId", jobscontroller.getJobsByEmployer);
// meetings
router.get("/meetings/:id", MeetingController.get_meetings);
// shortlisted
router.get(
  "/shortlisted/:id",
  ShortListedController.fetch_short_listed_contractors
);
router.get("/messages", MessageController.getAll);
router.get(
  "/messages/:role_user_id/:page/:limitPerPage",
  MessageController.getUserMessages
);
router.get(
  "/messages/:role_user_id/:id",
  MessageController.getUserMsgGreaterByIdReq
);
module.exports = router;
