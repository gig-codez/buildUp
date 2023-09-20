const express = require("express");
const AdminController = require("../controllers/admin.controller");
const AdminLogin = require("../Auth/adminLogin");
const router = express.Router();
router.post("/create/admin", AdminController.store);
router.post('/login/admin', AdminLogin.login)
module.exports = router;
