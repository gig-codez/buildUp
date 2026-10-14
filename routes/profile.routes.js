const { Router } = require("express");
const ProfileCompletionController = require("../controllers/profileCompletion.controller");
const router = Router();

// PATCH /profile/complete/:role/:userId
router.patch("/complete/:role/:userId", ProfileCompletionController.complete);

module.exports = router;
