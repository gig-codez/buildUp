const { default: mongoose } = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: ["freelancer", "employer", "supplier", "admin"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("role", roleSchema);
