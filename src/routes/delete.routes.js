const express = require("express");
const AdminController = require("../controllers/admin.controller");
const EmployerController = require("../controllers/employer.controller");
const router = express.Router();
router.delete("/admin/:id", AdminController.delete);

//delete employer
router.delete("/employer/:id", EmployerController.delete);
module.exports = router;
