const { Router } = require("express");
const RoleController = require("../controllers/role.controller");

const router = Router();
router.delete("/delete/:id", RoleController.delete);
module.exports = router;