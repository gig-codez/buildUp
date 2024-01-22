const { Router } = require("express");
const PortfolioController = require("../controllers/portfolio.controller");
const uploaderManager = require("../helpers/uploadManager");

const router = Router();
// get user portfolio
router.get("/:id", PortfolioController.get);
router.post("/:name",uploaderManager("images","portfolio",true) ,PortfolioController.store);
router.delete("/:id", PortfolioController.delete);
router.patch(
  "/:name",
  uploaderManager("images", "portfolio", true),
  PortfolioController.update
);
module.exports = router;
