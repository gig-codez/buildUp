const express = require("express");
const AdminController = require("../controllers/admin.controller");
const AccountVerification = require("../Auth/emailVerification");
const EmployerController = require("../controllers/employer.controller");
const RoleController = require("../controllers/role.controller");
const router = express.Router();

router.get("/admin", AdminController.index);
router.get("/verifyToken/:id", AccountVerification.verifyToken);
router.get("/employers", EmployerController.getAll);
router.get("/roles", RoleController.index);
module.exports = router;
