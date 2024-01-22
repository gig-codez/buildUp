const { default: mongoose } = require("mongoose");

const supplierDealModel = new mongoose.Schema(
  {
    supplierType: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
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
