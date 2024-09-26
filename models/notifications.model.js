const { Schema, model } = require("mongoose");

const notificationSchema = new Schema({
    message: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
}, { timestamps: true }
);
module.exports = model("notifications", notificationSchema);