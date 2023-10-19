const { default: mongoose } = require("mongoose");
const supplierModel = new mongoose.SupplierModel({
  profile_pic: {
    type: String,
    required: true,
  },
  business_email_address: {
    type: String,
    required: true,
  },
  about_business: {
    type: String,
    required: true,
  },
  type_of_product: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  TIN: {
    type: String,
    required: true,
  },
  business_ver_document: {
    type: String,
    required: true,
  },
  business_tel: {
    type: String,
    required: true,
  },
});
module.exports = mongoose.model("supplier", supplierModel);
