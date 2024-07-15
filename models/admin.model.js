const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
    profile_pic: {
        type: String,
        required: false,
        default:'',
      },
      name:{
        type: String,
        required: true
      },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
});
module.exports = mongoose.model("admin", adminSchema);