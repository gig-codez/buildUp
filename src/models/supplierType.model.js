const { default: mongoose } = require("mongoose");

const supplierTypeModel = mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        unique: true
      },
      description: {
        type: String,
        required: false,
      }
    },
    {
      timestamps: true,
    }
);
module.exports = mongoose.model("supplierType", supplierTypeModel);
