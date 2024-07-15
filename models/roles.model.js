const { default: mongoose } = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: false,
      enum: ["contractor", "client", "supplier", "admin", "consultant"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("role", roleSchema);
