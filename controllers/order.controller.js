const Order      = require("../models/order.model");
const walletModel = require("../models/wallet.model");

class OrderController {
  // POST /orders/create  — client places an order
  static async create(req, res) {
    try {
      const { supplierId, supplierName, clientId, deliveryAddress, items, totalAmount, paymentMethod, buyerWalletOwnerType } = req.body;
      if (!supplierId || !clientId || !deliveryAddress || !items?.length) {
        return res.status(400).json({ message: "Missing required order fields" });
      }

      const method = paymentMethod || "cash_on_delivery";
      // buyerWalletOwnerType comes from the Flutter app (user.walletOwnerType)
      // Falls back to "user" for new unified accounts
      const buyerOwnerType = buyerWalletOwnerType || "user";

      // ── Wallet payment: verify balance, then transfer ────────────────────
      if (method === "wallet") {
        const buyerWallet = await walletModel.findOne({ owner_id: clientId, owner_type: buyerOwnerType });
        if (!buyerWallet || buyerWallet.available_balance < totalAmount) {
          const balance = buyerWallet?.available_balance ?? 0;
          return res.status(400).json({
            message: `Insufficient wallet balance. Available: UGX ${balance.toLocaleString()}, required: UGX ${Number(totalAmount).toLocaleString()}.`,
          });
        }

        // Create the order
        const order = await Order.create({
          supplierId, supplierName, clientId, deliveryAddress, items, totalAmount,
          paymentMethod: method,
        });

        // Deduct from buyer
        buyerWallet.available_balance -= totalAmount;
        buyerWallet.transactions.push({
          type:        "debit",
          amount:      totalAmount,
          description: `Order payment to ${supplierName}`,
          reference:   order._id.toString(),
          status:      "completed",
        });
        await buyerWallet.save();

        // Credit supplier — auto-create wallet if they don't have one yet
        let supplierWallet = await walletModel.findOne({ owner_id: supplierId, owner_type: "supplier" });
        if (!supplierWallet) {
          supplierWallet = await walletModel.create({ owner_id: supplierId, owner_type: "supplier" });
        }
        supplierWallet.available_balance += totalAmount;
        supplierWallet.total_earned      += totalAmount;
        supplierWallet.transactions.push({
          type:        "credit",
          amount:      totalAmount,
          description: `Order payment received`,
          reference:   order._id.toString(),
          status:      "completed",
        });
        await supplierWallet.save();

        return res.status(201).json({ message: "Order created", data: order });
      }

      // ── Cash on delivery — no wallet changes ────────────────────────────
      const order = await Order.create({
        supplierId, supplierName, clientId, deliveryAddress, items, totalAmount,
        paymentMethod: method,
      });
      return res.status(201).json({ message: "Order created", data: order });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // GET /orders/client/:clientId  — client sees their orders
  static async getByClient(req, res) {
    try {
      const orders = await Order.find({ clientId: req.params.clientId })
        .sort({ createdAt: -1 });
      return res.status(200).json({ data: orders });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // GET /orders/supplier/:supplierId  — supplier sees their incoming orders
  static async getBySupplier(req, res) {
    try {
      const orders = await Order.find({ supplierId: req.params.supplierId })
        .sort({ createdAt: -1 });
      return res.status(200).json({ data: orders });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // GET /orders/all  — admin sees all orders, optional ?status= filter
  static async getAll(req, res) {
    try {
      const filter = {};
      if (req.query.status) filter.status = req.query.status;
      const orders = await Order.find(filter).sort({ createdAt: -1 });
      return res.status(200).json({ data: orders });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // PATCH /orders/:id/status  — supplier or admin updates status
  static async updateStatus(req, res) {
    try {
      const { status } = req.body;
      const validStatuses = ["pending", "approved", "delivered", "cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );
      if (!order) return res.status(404).json({ message: "Order not found" });
      return res.status(200).json({ message: "Order updated", data: order });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // PATCH /orders/:id/cancel  — client cancels a pending order
  static async cancel(req, res) {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ message: "Order not found" });
      if (order.status !== "pending") {
        return res.status(400).json({ message: "Only pending orders can be cancelled" });
      }
      order.status = "cancelled";
      await order.save();
      return res.status(200).json({ message: "Order cancelled", data: order });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
}

module.exports = OrderController;
