const { default: mongoose } = require("mongoose");

// A single selectable option within a variant group/axis
// (e.g. within the "Color" group: {value: "Red", price: 0}).
const variantOptionSchema = new mongoose.Schema(
  {
    value: { type: String, required: true },  // e.g. "Red", "Large", "50kg"
    price: { type: Number, default: 0 },      // surcharge added to base product_price
  },
  { _id: false }
);

// A variant axis/group on the product (e.g. "Size", "Color", "Grade").
// A product can have multiple independent groups at once — a buyer picks
// ONE option from each group, and the order line records the full
// combination (e.g. Size=Large + Color=Red on a single t-shirt line item).
const productVariantSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true },  // e.g. "Size", "Color", "Grade"
    options: { type: [variantOptionSchema], default: [] },
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
