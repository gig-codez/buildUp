const { default: mongoose } = require("mongoose");

const shortListSchema = new mongoose.Schema(
  {
    contractorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "freelancer",
      required: true,
    },
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "employer",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("shortListed", shortListSchema);
