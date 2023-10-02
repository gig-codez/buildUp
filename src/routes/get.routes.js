const express = require("express");
const AdminController = require("../controllers/admin.controller");
const AccountVerification = require("../Auth/emailVerification");
const router = express.Router();

router.get("/admin", AdminController.index);
router.get("/verifyToken/:id",AccountVerification.verifyToken);

module.exports = router;
