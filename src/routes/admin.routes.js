const express = require("express");
router = express.Router();
const AdminController = require("../controllers/admin.controller");
const AdminLogin = require("../Auth/adminLogin");
const RoleController = require("../controllers/role.controller");
const ContractorProfessionController = require("../controllers/contractorProfession.controller");
const SupplierTypeController = require("../controllers/supplierType.controller");
router.get("/", AdminController.index);
router.post("/admin/login", AdminLogin.login);
router.post("/create/admin", AdminController.store);
router.patch("/:id", AdminController.update);
router.delete("/:id", AdminController.delete);
// add roles
router.post("/add/role", RoleController.store);
router.get("/roles", RoleController.index);
// add professionals
router.post("/profession", ContractorProfessionController.store);
router.post("/supplier-type", SupplierTypeController.store);
// get user data
router.get("/userData", AdminController.userData);
module.exports = router;
