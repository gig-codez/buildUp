const express = require("express");
const router = express.Router();
const PaymentController = require("../controllers/payment.controller");

router.post("/registerIPN", PaymentController.registerIPN);
router.get("/cancelPayment", PaymentController.cancelPayment);
// process payment route
router.post("/processTransaction", PaymentController.processTransaction);
router.post("/processRefund", PaymentController.processRefund);
// 
router.get("/listIPNS", PaymentController.listIPNS);
router.get("/completePayment", PaymentController.completePayment);
router.post("/processOrder", PaymentController.processOrder);
router.get("/checkStatus", PaymentController.checkTransactionStatus);
router.get("/transactions/:id", PaymentController.transactions);
router.delete("/deleteTransaction/:id", PaymentController.deleteTransaction);
router.patch("/updateTransaction/:id", PaymentController.updateTransaction);
// recipients
router.get("/contractors", PaymentController.contractors);
router.get("/consultants", PaymentController.consultants);
router.get("/suppliers", PaymentController.suppliers);
module.exports = router;
