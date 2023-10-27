const { default: mongoose } = require("mongoose");
const supplierModel = new mongoose.Schema({
  business_name: {
    type: String,
    required: true,
  },
  profile_pic: {
    type: String,
    required: false,
  },
  business_email_address: {
    type: String,
    required: true,
  },
  about_business: {
    type: String,
    required: false,
  },
  type_of_product: {
    type: String,
    required: false,
  },
  password: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: false,
  },
  TIN: {
    type: String,
    required: true,
  },
  business_ver_document: {
    type: String,
    required: false,
  },
  business_tel: {
    type: String,
    required: true,
  },
  role: {
    type: mongoose.Types.ObjectId,
    ref: "role",
    required: true,
  },
});
module.exports = mongoose.model("supplier", supplierModel);
