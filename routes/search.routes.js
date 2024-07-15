const { Router } = require("express");
const SearchController = require("../controllers/search.controller");

const router = Router();
router.get("/", SearchController.query);
module.exports = router;
