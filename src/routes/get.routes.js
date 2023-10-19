const express = require("express");
const AdminController = require("../controllers/admin.controller");
const AccountVerification = require("../Auth/emailVerification");
const EmployerController = require("../controllers/employer.controller");
const router = express.Router();

router.get("/admin", AdminController.index);
router.get("/verifyToken/:id", AccountVerification.verifyToken);

//employers
router.get("/employers", EmployerController.index);
router.get("/employers/:id", EmployerController.index);
module.exports = router;
