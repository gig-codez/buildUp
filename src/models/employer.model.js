const { default: mongoose } = require("mongoose");
const employerModel = new mongoose.Schema({
  username: {
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
  email: {
    type: String,
    required: true,
    }, password: {
      type: String,
      required: true,
  }
});
module.exports = mongoose.model("employer", employerModel);
