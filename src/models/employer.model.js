const { default: mongoose } = require("mongoose");
const employerModel = new mongoose.Schema(
  {
    profile_pic: {
      type: String,
      required: false,
    },
    email_address: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    first_name: {
      type: String,
      required: true,
    },
    last_name: {
      type: String,
      required: true,
    },
    TIN_NIN: {
      type: String,
      required: false,
    },
    country: {
      type: String,
      required: false,
    },
    business: [{ type: mongoose.Types.ObjectId, ref: "business" }],
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("employer", employerModel);
