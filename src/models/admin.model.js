const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    admin_id: {
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
    profile_picture: {
        type: String,
        required: true
    }
});
module.exports = mongoose.model("admin", adminSchema);