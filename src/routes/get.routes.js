const express = require("express");
const AdminController = require("../controllers/admin.controller");
const router = express.Router();

router.get("/admin", AdminController.index);

module.exports = router;
