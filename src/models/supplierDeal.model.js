const { default: mongoose } = require("mongoose");

const supplierDealModel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("supplierDeal", supplierDealModel);
