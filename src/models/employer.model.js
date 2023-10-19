const { default: mongoose } = require("mongoose");
const employerModel = new mongoose.Schema({
 
  profile_pic: {
    type: String,
    required: false,
  },
  email_address: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: false,
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
    required: true,
  },
  country: {
    type: String,
    required: false,
  },
  business_name: {
    type: String,
    required: true,
  },
  year_of_foundation: {
    type: Number,
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
