const { Router } = require("express");
const ReviewController = require("../controllers/review.controller");
const router = Router();

router.post("/add",        ReviewController.add);
router.get("/:userId",     ReviewController.getByUser);

module.exports = router;
