const { Router } = require("express");
const SupplierController = require("../controllers/supplier.controller");
const uploader = require("../helpers/uploadManager");
const { PRODUCT_CATEGORIES, PRODUCT_UNITS } = require("../constants/categories");
const router = Router();

router.get("/categories", (req, res) => res.json({ data: PRODUCT_CATEGORIES }));
router.get("/units", (req, res) => res.json({ data: PRODUCT_UNITS }));
router.get("/get_stocks", SupplierController.getAllStocks);
router.post("/add_stock",uploader().single("image"),SupplierController.create_stock);
router.get("/get_stock/:id",SupplierController.stock);
router.patch("/update_stock/:id",uploader().single("image"),SupplierController.update_stock);
router.delete("/delete_stock/:id",SupplierController.delete_stock);
router.get("/search", SupplierController.search_stock);
router.get("/analytics/:supplierId", SupplierController.supplier_analytics);
module.exports = router;