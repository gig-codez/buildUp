const { Router } = require("express");
const SupplierController = require("../controllers/supplier.controller");
const uploader = require("../helpers/uploadManager");
const router = Router();
router.post("/add_stock",uploader().single("image"),SupplierController.create_stock);
router.get("/get_stock/:id",SupplierController.stock);
router.patch("/update_stock/:id",uploader().single("image"),SupplierController.update_stock);
router.delete("/delete_stock/:id",SupplierController.delete_stock);
module.exports = router;