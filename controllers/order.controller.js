const Order = require("../models/order.model");

class OrderController {
  // POST /orders/create  — client places an order
  static async create(req, res) {
    try {
      const { supplierId, supplierName, clientId, deliveryAddress, items, totalAmount, paymentMethod } = req.body;
      if (!supplierId || !clientId || !deliveryAddress || !items?.length) {
        return res.status(400).json({ message: "Missing required order fields" });
      }
      const order = await Order.create({
        supplierId, supplierName, clientId, deliveryAddress, items, totalAmount,
        paymentMethod: paymentMethod || "cash_on_delivery",
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
