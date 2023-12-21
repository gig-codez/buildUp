const express = require("express");
const EmployerController = require("../controllers/employer.controller");
const AdminController = require("../controllers/admin.controller");
const BusinessController = require("../controllers/business.controller");
const SupplierController = require("../controllers/supplier.controller");
const FreelancerController = require("../controllers/freelancer.controller");
const Password = require("../Auth/userpassword");
const router = express.Router();

router.patch("/admin/:id", AdminController.update);
//freelancer update
router.patch("/freelancer/:id", FreelancerController.update);
//employer update
// router.patch("/employer/:id", EmployerController.updateEmployer);
//update business
router.patch("/business/:id", BusinessController.updateBusiness);
//update supplier
router.patch("/suppliers/:id", SupplierController.update);

router.patch("/resetpassword/:token", Password.resetPassword);

module.exports = router;
