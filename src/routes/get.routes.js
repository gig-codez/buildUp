const express = require("express");
const AdminController = require("../controllers/admin.controller");
const AccountVerification = require("../Auth/emailVerification");
const router = express.Router();

router.get("/admin", AdminController.index);
router.get("/verifyEmail/:id",AccountVerification.verifyToken);

module.exports = router;
