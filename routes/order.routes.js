const { Router } = require("express");
const OrderController = require("../controllers/order.controller");
const router = Router();

router.post("/create",                    OrderController.create);
router.get("/all",                        OrderController.getAll);          // admin
router.get("/client/:clientId",           OrderController.getByClient);
router.get("/supplier/:supplierId",       OrderController.getBySupplier);
router.patch("/:id/status",               OrderController.updateStatus);
router.patch("/:id/cancel",               OrderController.cancel);

module.exports = router;
