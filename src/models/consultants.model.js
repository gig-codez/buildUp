const { default: mongoose } = require("mongoose");

const consultantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    profession: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: false,
    },
    profileImage: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("consultant", consultantSchema);
