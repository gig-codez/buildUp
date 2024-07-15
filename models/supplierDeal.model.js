const { default: mongoose } = require("mongoose");

const supplierDealModel = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Types.ObjectId,
      ref: "supplier",
      required: true,
      index: true
    },
    deal: {
      type: mongoose.Types.ObjectId,
      ref: "deal",
      required: true,
      index: true
    },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("supplierDeal", supplierDealModel);
