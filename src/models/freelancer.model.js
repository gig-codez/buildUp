const { default: mongoose } = require("mongoose");

const freelancerSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Types.ObjectId,
    required: false,
    default: "",
  },
  freelancer_id: {
    type: mongoose.Types.ObjectId,
    required: false,
    default: "",
  },
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
    required: false,
    default: "",
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
    required: true,
  },
  NIN: {
    type: Number,
    required: true,
  },
  profession: {
    type: String,
    required: true,
  },
  cv_document: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("freelancer", freelancerSchema);
