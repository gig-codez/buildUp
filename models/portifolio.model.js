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
