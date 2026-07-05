const { default: mongoose } = require("mongoose");

const productVariantSchema = new mongoose.Schema(
  {
    name:  { type: String, required: true },  // e.g. "Size", "Color", "Grade"
    value: { type: String, required: true },  // e.g. "50kg", "Grey", "OPC 42.5"
    price: { type: Number, default: 0 },      // surcharge added to base product_price
  },
  { _id: false }
);

const supplierStockSchema = new mongoose.Schema(
  {
    supplier_id: {
      type: mongoose.Types.ObjectId,
      ref: "supplier",
      required: true,
    },
    product_name: {
      type: String,
      required: true,
    },
    product_quantity: {
      type: Number,
      required: true,
    },
    product_price: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      default: "In stock",
      required: false,
    },
    product_image: {
      type: String,
      default: "",
      required: false,
    },
    category: {
      type: String,
      default: "Other",
      required: false,
      index: true,
    },
    description: {
      type: String,
      default: "",
      required: false,
    },
    unit: {
      type: String,
      default: "piece",
      required: false,
    },
    variants: {
      type: [productVariantSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

supplierStockSchema.index({ category: 1, status: 1 });

module.exports = mongoose.model("supplierStock", supplierStockSchema);
