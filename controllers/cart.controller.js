const Cart = require("../models/cart.model");

class CartController {
  // POST /cart/add — add item to cart
  static async addItem(req, res) {
    try {
      const { clientId, productId, productName, productImage, productPrice, supplierId, supplierName, quantity } = req.body;

      if (!clientId || !productId || !productPrice || !supplierId || quantity < 1) {
        return res.status(400).json({ message: "Missing or invalid required fields" });
      }

      let cart = await Cart.findOne({ clientId });

      if (!cart) {
        cart = await Cart.create({
          clientId,
          items: [{
            productId,
            productName,
            productImage,
            productPrice,
            supplierId,
            supplierName,
            quantity,
            subtotal: productPrice * quantity,
          }],
        });
      } else {
        const existingItem = cart.items.find(item => item.productId === productId && item.supplierId === supplierId);

        if (existingItem) {
          existingItem.quantity += quantity;
          existingItem.subtotal = existingItem.productPrice * existingItem.quantity;
        } else {
          cart.items.push({
            productId,
            productName,
            productImage,
            productPrice,
            supplierId,
            supplierName,
            quantity,
            subtotal: productPrice * quantity,
          });
        }
        await cart.save();
      }

      return res.status(201).json({
        message: "Item added to cart successfully",
        data: cart
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // GET /cart/:clientId — get cart for client
  static async getCart(req, res) {
    try {
      const cart = await Cart.findOne({ clientId: req.params.clientId });

      if (!cart) {
        return res.status(200).json({
          message: "Cart is empty",
          data: { clientId: req.params.clientId, items: [], totalAmount: 0, totalItems: 0 }
        });
      }

      return res.status(200).json({
        message: "Cart retrieved successfully",
        data: cart
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // DELETE /cart/:clientId/remove/:productId — remove item from cart
  static async removeItem(req, res) {
    try {
      const { clientId, productId } = req.params;

      const cart = await Cart.findOne({ clientId });
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      cart.items = cart.items.filter(item => item.productId !== productId);
      await cart.save();

      return res.status(200).json({
        message: "Item removed from cart",
        data: cart
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // PATCH /cart/:clientId/update/:productId — update quantity of item in cart
  static async updateItemQuantity(req, res) {
    try {
      const { clientId, productId } = req.params;
      const { quantity } = req.body;

      if (quantity < 1) {
        return res.status(400).json({ message: "Quantity must be at least 1" });
      }

      const cart = await Cart.findOne({ clientId });
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      const item = cart.items.find(i => i.productId === productId);
      if (!item) {
        return res.status(404).json({ message: "Item not found in cart" });
      }

      item.quantity = quantity;
      item.subtotal = item.productPrice * quantity;
      await cart.save();

      return res.status(200).json({
        message: "Item quantity updated",
        data: cart
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // DELETE /cart/:clientId/clear — clear entire cart
  static async clearCart(req, res) {
    try {
      const { clientId } = req.params;

      const cart = await Cart.findOne({ clientId });
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      cart.items = [];
      await cart.save();

      return res.status(200).json({
        message: "Cart cleared successfully",
        data: cart
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // GET /cart/supplier/:supplierId — get all carts for a supplier's products
  static async getSupplierCarts(req, res) {
    try {
      const { supplierId } = req.params;

      const carts = await Cart.find({ "items.supplierId": supplierId });

      return res.status(200).json({
        message: "Supplier carts retrieved",
        data: carts
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
}

module.exports = CartController;
