const express = require("express");
const router = express.Router();
const CartController = require("../controllers/cart.controller");

// Add item to cart
router.post("/add", CartController.addItem);

// Get cart for client
router.get("/:clientId", CartController.getCart);

// Remove item from cart
router.delete("/:clientId/remove/:productId", CartController.removeItem);

// Update item quantity in cart
router.patch("/:clientId/update/:productId", CartController.updateItemQuantity);

// Clear entire cart
router.delete("/:clientId/clear", CartController.clearCart);

// Get all carts for a supplier
router.get("/supplier/:supplierId", CartController.getSupplierCarts);

module.exports = router;
