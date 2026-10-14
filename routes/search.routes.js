const { Router } = require("express");
const SearchController = require("../controllers/search.controller");

const router = Router();
// Filtered + paginated contractor directory.
router.get("/contractors", SearchController.contractors);
router.get("/", SearchController.query);
module.exports = router;
