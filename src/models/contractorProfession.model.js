const { default: mongoose } = require("mongoose");

const contractorProfessionModel = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    roleId: {
      type: mongoose.Types.ObjectId,
      ref: "role",
      // required: true,
    },
    // description: {
    //   type: String,
    //   required: false,
    // },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model(
  "contractorProfession",
  contractorProfessionModel
);
