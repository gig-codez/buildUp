const { default: mongoose } = require("mongoose");

const consultantCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    consultantId: {
      type: mongoose.Types.ObjectId,
      ref: "role",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model(
  "consultant_category",
  consultantCategorySchema
);
