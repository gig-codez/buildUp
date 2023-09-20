const { default: mongoose } = require("mongoose");
const supplierModel = new mongoose.SupplierModel({
  freelancer: {
    type: mongoose.Types.ObjectId,
    required: false,
  },
  business_name: {
    type: String,
    required: true,
  },
  year_of_foundation: {
    type: Number,
    required: true,
  },
  business_email: {
    type: String,
    required: true,
  },
  about_business: {
    type: String,
    required: true,
  },
  TIN: {
    type: String,
    required: true,
  },
  business_address: {
    type: String,
    required: true,
  },
  social_links: {
    type: Array,
    required: false,
    default: [],
  },
});
module.exports = mongoose.model("supplier", supplierModel);
