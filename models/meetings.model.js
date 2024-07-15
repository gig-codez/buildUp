const { default: mongoose } = require("mongoose");
const meetingsSchema = new mongoose.Schema(
  {
    employer_id: {
      type: mongoose.Types.ObjectId,
      ref: "employer",
      required: true,
    },

    subject: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("meetings", meetingsSchema);
