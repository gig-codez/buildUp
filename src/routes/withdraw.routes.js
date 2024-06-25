const { Router } = require("express");
const WithdrawController = require("../controllers/withdraw.controller");

const router = Router();
// define all required routes: 
// get all withdraws
router.get("/", WithdrawController.getWithdraws);
// add withdraw
router.post("/store/", WithdrawController.storeWithdraws);
// update withdraw
router.patch("/update/:id", WithdrawController.updateWithdraws);
// delete withdraw
router.delete("/delete/:id", WithdrawController.deleteWithdraws);
module.exports = router;