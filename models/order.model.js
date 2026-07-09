const mongoose = require("mongoose");

// Mirrors cart.model.js's selectedVariantSchema — preserves the exact
// variant combination (e.g. Size=Large + Color=Red) the buyer ordered.
const selectedVariantSchema = new mongoose.Schema({
  name:  { type: String, required: true },
  value: { type: String, required: true },
  price: { type: Number, default: 0 },
}, { _id: false });

const orderItemSchema = new mongoose.Schema({
  productId:    { type: String, required: true },
  productName:  { type: String, required: true },
  productImage: { type: String, default: "" },
  selectedVariants: { type: [selectedVariantSchema], default: [] },
  quantity:     { type: Number, required: true, min: 1 },
  unitPrice:    { type: Number, required: true },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  supplierId: {
    type: mongoose.Types.ObjectId,
    ref: "supplier",
    required: true,
  },
  supplierName: { type: String, required: true },
  clientId: {
    type: mongoose.Types.ObjectId,
    ref: "employer",
    required: true,
  },
  deliveryAddress: { type: String, required: true },
  items: { type: [orderItemSchema], required: true },
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "approved", "delivered", "cancelled"],
    default: "pending",
  },
  paymentMethod: {
    type: String,
    enum: ["cash_on_delivery", "wallet"],
    default: "cash_on_delivery",
  },
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
