const express = require("express");
// const EmployerController = require("../controllers/employer.controller");
const AdminController = require("../controllers/admin.controller");
const router = express.Router();

router.patch("/admin/:id", AdminController.update);
//update employer
router.patch("/employer/:id", EmployerController.update);

module.exports = router;
