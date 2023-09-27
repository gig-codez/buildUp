const { default: mongoose } = require("mongoose");
const employerModel = new mongoose.Schema({
  user_id: {
    type: mongoose.Types.ObjectId,
    required: false,
    default: "",
  },
  employer_id: {
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
  business_ver_document: {
    type: String,
    required: false,
  },
  about_business: {
    type: String,
    required: false,
  },
  business_tel: {
    type: String,
    required: false,
  },
});
module.exports = mongoose.model("employer", employerModel);
