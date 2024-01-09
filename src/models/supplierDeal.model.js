const { default: mongoose } = require("mongoose");

const supplierDealModel = mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        unique: true
      },
      description: {
        type: String,
        required: false,
      },
      deal: {
        type: mongoose.Types.ObjectId,
        ref: "deal",
        required: true,
      },
      supplier: {
        type: mongoose.Types.ObjectId,
        ref: "supplier",
        required: true,
      },
    },
    {
      timestamps: true,
    }
);
module.exports = mongoose.model("supplierDeal", supplierDealModel);
