const { default: mongoose } = require("mongoose");

const freelancerSchema = new mongoose.Schema(
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
    tel_num: {
      type: Number,
      required: true,
    },
    country: {
      type: String,
      required: false,
    },
    NIN: {
      type: String,
      required: true,
    },
    profession: {
      type: String,
      required: false,
    },
    cv_document: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("freelancer", freelancerSchema);
