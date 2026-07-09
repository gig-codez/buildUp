const mongoose = require('mongoose');

// Records the specific combination of variant options a buyer picked for
// this cart line (e.g. Size=Large + Color=Red on a single t-shirt line),
// one entry per variant group/axis on the product.
const selectedVariantSchema = new mongoose.Schema({
  name:  { type: String, required: true },  // group name, e.g. "Size"
  value: { type: String, required: true },  // chosen option, e.g. "Large"
  price: { type: Number, default: 0 },      // that option's surcharge
}, { _id: false });

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  productImage: {
    type: String,
  },
  productPrice: {
    type: Number,
    required: true,
  },
  selectedVariants: {
    type: [selectedVariantSchema],
    default: [],
  },
  // Sum of selectedVariants' surcharges — cached so unitPrice = productPrice + variantPrice.
  variantPrice: {
    type: Number,
    default: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  supplierId: {
    type: String,
    required: true,
  },
  supplierName: {
    type: String,
  },
  subtotal: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

const cartSchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: true,
    unique: true,
  },
  items: [cartItemSchema],
  totalAmount: {
    type: Number,
    default: 0,
  },
  totalItems: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

// Middleware to calculate totals before saving
cartSchema.pre('save', function(next) {
  this.totalAmount = this.items.reduce((sum, item) => {
    item.subtotal = (item.productPrice + (item.variantPrice || 0)) * item.quantity;
    return sum + item.subtotal;
  }, 0);
  this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  next();
});

module.exports = mongoose.model('Cart', cartSchema);
