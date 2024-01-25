const express = require("express");
const router = express.Router();
const PaymentController = require("../controllers/payment.controller");

router.post("/registerIPN", PaymentController.registerIPN);
router.get("/finishPayment", PaymentController.finishPayment);
router.get("/cancelPayment", PaymentController.cancelPayment);
router.get("/listIPNS", PaymentController.listIPNS);
router.get("/completePayment", PaymentController.completePayment);
router.post("/processOrder", PaymentController.processOrder);
router.get("/checkStatus", PaymentController.checkTransactionStatus);
router.get("/transactions/:id", PaymentController.transactions);
router.delete("/deleteTransaction/:id", PaymentController.deleteTransaction);
router.patch("/updateTransaction/:id",PaymentController.updateTransaction);
module.exports = router;
