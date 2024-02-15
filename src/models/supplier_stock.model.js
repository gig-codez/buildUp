const { default: mongoose } = require("mongoose");
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
    status: {
      type: String,
      default: "in_stock",
      required: false,
    },
    product_image: {
      type: String,
      default: "",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("supplierStock", supplierStockSchema);
