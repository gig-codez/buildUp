const { Schema, model } = require("mongoose");

const notificationSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    title: {
        type: String,
        default: "Notification",
    },
    message: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ["job", "application", "payment", "escrow", "order", "system"],
        default: "system",
    },
    read: {
        type: Boolean,
        default: false,
    },
    // Legacy fields kept for backward compatibility
    phone: {
        type: String,
        default: "",
    },
}, { timestamps: true });

module.exports = model("notifications", notificationSchema);