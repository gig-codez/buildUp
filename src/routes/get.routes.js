const express = require("express");
const AdminController = require("../controllers/admin.controller");
const AccountVerification = require("../Auth/emailVerification");
const EmployerController = require("../controllers/employer.controller");
const RoleController = require("../controllers/role.controller");
const BusinessController = require("../controllers/business.controller");
const SupplierController = require("../controllers/supplier.controller");
const FreelancerController = require("../controllers/freelancer.controller");
const router = express.Router();

router.get("/admin", AdminController.index);
router.get("/verifyToken/:id", AccountVerification.verifyToken);
router.get("/roles", RoleController.index);
//freelancers
router.get("/freelancers", FreelancerController.index);
router.get("/freelancers/:id", FreelancerController.show);
//employers
router.get("/employers", EmployerController.getAll);
router.get("/employers/:id", EmployerController.show);
//business
router.get("/business", BusinessController.getAll);
router.get("/business/:id", BusinessController.getBusinessById);
//suppliers
router.get("/suppliers", SupplierController.getAll);
router.get("/suppliers/:id", SupplierController.show);

module.exports = router;
