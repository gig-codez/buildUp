const Cart = require("../models/cart.model");

// A product with multiple variant groups (e.g. Size + Color on one t-shirt)
// is still a SINGLE cart line per combination chosen — two different
// combinations of the same product must NOT be merged together. This key
// is order-independent so {Size:L, Color:Red} and {Color:Red, Size:L}
// collapse to the same line.
function variantKey(selectedVariants) {
  return (selectedVariants || [])
    .map((v) => `${v.name}:${v.value}`)
    .sort()
    .join("|");
}

// Parses the `?selectedVariants=` query param (a JSON-encoded array) sent by
// remove/update requests to disambiguate which variant combo's cart line to
// target. Returns null when omitted, so callers can fall back to matching
// by productId alone (fine for products without variants).
function parseVariantsQuery(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return variantKey(Array.isArray(parsed) ? parsed : []);
  } catch (_) {
    return null;
  }
}

class CartController {
  // POST /cart/add — add item to cart
  static async addItem(req, res) {
    try {
      const { clientId, productId, productName, productImage, productPrice, supplierId, supplierName, quantity } = req.body;
      const selectedVariants = Array.isArray(req.body.selectedVariants) ? req.body.selectedVariants : [];
      const variantPrice = selectedVariants.reduce((sum, v) => sum + (Number(v.price) || 0), 0);

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
            selectedVariants,
            variantPrice,
            supplierId,
            supplierName,
            quantity,
            subtotal: (productPrice + variantPrice) * quantity,
          }],
        });
      } else {
        const key = variantKey(selectedVariants);
        const existingItem = cart.items.find(
          (item) =>
            item.productId === productId &&
            item.supplierId === supplierId &&
            variantKey(item.selectedVariants) === key
        );

        if (existingItem) {
          existingItem.quantity += quantity;
          existingItem.subtotal = (existingItem.productPrice + (existingItem.variantPrice || 0)) * existingItem.quantity;
        } else {
          cart.items.push({
            productId,
            productName,
            productImage,
            productPrice,
            selectedVariants,
            variantPrice,
            supplierId,
            supplierName,
            quantity,
            subtotal: (productPrice + variantPrice) * quantity,
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

  // DELETE /cart/:clientId/remove/:productId?selectedVariants=[...] — remove item from cart
  // selectedVariants disambiguates between different variant combos of the
  // same product; omit it to target the only/first line for that product.
  static async removeItem(req, res) {
    try {
      const { clientId, productId } = req.params;
      const targetKey = parseVariantsQuery(req.query.selectedVariants);

      const cart = await Cart.findOne({ clientId });
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      if (targetKey === null) {
        cart.items = cart.items.filter(item => item.productId !== productId);
      } else {
        cart.items = cart.items.filter(
          item => !(item.productId === productId && variantKey(item.selectedVariants) === targetKey)
        );
      }
      await cart.save();

      return res.status(200).json({
        message: "Item removed from cart",
        data: cart
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // PATCH /cart/:clientId/update/:productId?selectedVariants=[...] — update quantity of item in cart
  static async updateItemQuantity(req, res) {
    try {
      const { clientId, productId } = req.params;
      const { quantity } = req.body;
      const targetKey = parseVariantsQuery(req.query.selectedVariants);

      if (quantity < 1) {
        return res.status(400).json({ message: "Quantity must be at least 1" });
      }

      const cart = await Cart.findOne({ clientId });
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      const item = targetKey === null
        ? cart.items.find(i => i.productId === productId)
        : cart.items.find(i => i.productId === productId && variantKey(i.selectedVariants) === targetKey);
      if (!item) {
        return res.status(404).json({ message: "Item not found in cart" });
      }

      item.quantity = quantity;
      item.subtotal = (item.productPrice + (item.variantPrice || 0)) * quantity;
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
