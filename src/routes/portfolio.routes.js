const { Router } = require("express");
const PortfolioController = require("../controllers/portfolio.controller");
const uploaderManager = require("../helpers/uploadManager");

const router = Router();
// get user portfolio
router.get("/:id", PortfolioController.get);
router.post("/add",uploaderManager().array("images") ,PortfolioController.store);
router.delete("/:id", PortfolioController.delete);
router.delete("/delete-many/:id", PortfolioController.delete_many);
router.patch(
  "/",
  uploaderManager().array("images"),
  PortfolioController.update
);
module.exports = router;
