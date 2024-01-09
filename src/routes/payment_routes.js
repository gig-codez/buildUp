const express = require("express");
const router = express.Router();
const PaymentController = require("../controllers/payment.controller");


router.post("/registerIPN", PaymentController.registerIPN);
router.get("/finishPayment", PaymentController.finishPayment);
router.get("/cancelPayment", PaymentController.cancelPayment);
router.get("/listIPNS", PaymentController.listIPNS);
router.get("/completePayment", PaymentController.completePayment);
router.post("/processOrder", PaymentController.processOrder);

module.exports = router;
