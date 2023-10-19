const express = require("express");
const AdminController = require("../controllers/admin.controller");
const AccountVerification = require("../Auth/emailVerification");
<<<<<<< HEAD
const EmployerController = require("../controllers/employer.controller");
const router = express.Router();

router.get("/admin", AdminController.index);
router.get("/verifyToken/:id", AccountVerification.verifyToken);

//employers
router.get("/employers", EmployerController.index);
router.get("/employers/:id", EmployerController.index);
=======
const EmployerController = require("../controllers/Employer.controller");
const RoleController = require("../controllers/role.controller");
const router = express.Router();

router.get("/admin", AdminController.index);
router.get("/verifyToken/:id",AccountVerification.verifyToken);
router.get("/employers", EmployerController.getAll);
router.get("/roles", RoleController.index);
>>>>>>> 8d642891b7513a69d2556d48d28aedceb247981c
module.exports = router;
