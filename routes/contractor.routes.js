const { Router } = require("express");
const FreelancerController = require("../controllers/freelancer.controller");
const router = Router();
// deactivate contractor/ consultants account
router.patch("/deactivate/:id", FreelancerController.deactivate);
module.exports = router;