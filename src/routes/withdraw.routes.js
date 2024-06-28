const { Router } = require("express");
const WithdrawController = require("../controllers/withdraw.controller");

const router = Router();
// define all required routes: 
// get all withdraws for the admin
router.get("/", WithdrawController.getWithdraws);
// get all withdraws for the client
router.get("/client-withdraws/:id", WithdrawController.getClientWithdraws);
// add withdraw
router.post("/store", WithdrawController.storeWithdraws);
// update withdraw
router.put("/update/:id", WithdrawController.updateWithdraws);
// delete withdraw
router.delete("/delete/:id", WithdrawController.deleteWithdraws);
// approve new withdraw
router.put("/approve/:id", WithdrawController.approveWithdraw);
// clear withdraw
router.put("/clear/:id", WithdrawController.clearWithdraw);
module.exports = router;