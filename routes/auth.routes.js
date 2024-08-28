const { Router } = require("express");
const { LoginController } = require("../Auth/login");

const router = Router();
router.post("/login", LoginController.loginUser);

module.exports = router;