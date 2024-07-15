const { default: mongoose } = require("mongoose");

const dealModel = mongoose.Schema(
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
      supplier_type: {
        type: mongoose.Types.ObjectId,
        ref: "supplierType",
        required: true,
      },
    },
    {
      timestamps: true,
    }
);
module.exports = mongoose.model("deal", dealModel);
