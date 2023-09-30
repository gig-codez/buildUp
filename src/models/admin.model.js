const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    admin_id: {
        type: String,
        required: true
    },
    profile_pic: {
        type: String,
        required: false,
      },
    email_address: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
});
module.exports = mongoose.model("admin", adminSchema);