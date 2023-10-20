const express = require("express");
const AdminController = require("../controllers/admin.controller");
const EmployerController = require("../controllers/employer.controller");
const BusinessController = require("../controllers/business.controller");
const SupplierController = require("../controllers/supplier.controller");
const FreelancerController = require("../controllers/freelancer.controller");
const router = express.Router();

router.delete("/admin/:id", AdminController.delete);

//delete freelancer
router.delete("/freelancer/:id", FreelancerController.delete);
//delete employer
router.delete("/employer/:id", EmployerController.deleteEmployer);
//delete business
router.delete("/business/:id", BusinessController.deleteBusiness);
//delete supplier
router.delete("/suppliers/:id", SupplierController.delete);
module.exports = router;
