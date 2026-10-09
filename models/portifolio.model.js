const { default: mongoose } = require("mongoose");

const portfolioSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    clientName: {
      type: String,
      required: true,
    },
    projectName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    snaps: [
      {
        type: String,
        required: false,
      },
    ],
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("portfolio", portfolioSchema);

// The contractor directory loads every portfolio entry for a page of
// contractors in one batched query (`ownerId: { $in: [...] }`), so this needs
// an index to avoid a full collection scan per page request.
portfolioSchema.index({ ownerId: 1, _id: -1 });
