const express = require("express");
router = express.Router();
const AdminController = require("../controllers/admin.controller");
const AdminLogin = require("../Auth/adminLogin");
const RoleController = require("../controllers/role.controller");
const ContractorProfessionController = require("../controllers/contractorProfession.controller");
const SupplierTypeController = require("../controllers/supplierType.controller");
const ContactRequestController = require("../controllers/contactRequest.controller");
const MessageController = require("../controllers/message.controller");

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
// deactivate / reactivate user
router.patch("/deactivate/:id", AdminController.deactivateUser);
router.patch("/reactivate/:id", AdminController.reactivateUser);

// ── Contact Requests (client → admin → contractor routing) ───────────────
router.post("/contact-request", ContactRequestController.create);
router.get("/contact-requests", ContactRequestController.getAll);
router.patch("/contact-requests/:id/status", ContactRequestController.updateStatus);

// ── Admin message inbox (all comms route through admin) ───────────────────
router.get("/messages", MessageController.getAdminMessages);
router.patch("/messages/:id/forward", MessageController.forwardMessage);
router.patch("/messages/:id/reject", MessageController.rejectMessage);

module.exports = router;
