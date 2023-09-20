const express = require("express");
const AdminController = require("../controllers/admin.controller");
const router = express.Router();

router.patch("/admin/:id", AdminController.update);
module.exports = router;
