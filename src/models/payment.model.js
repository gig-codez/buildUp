const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
    payment_id: {
        type: mongoose.Types.ObjectId,
        required: true,
    },
    contractee_user_id: {
        type: mongoose.Types.ObjectId,
        required: true,
    },
    contractor_user_id: {
        type: mongoose.Types.ObjectId,
        required: true,
    },
    job_contract_id: {
        type: mongoose.Types.ObjectId,
        required: true,
    },
    payment_amount: {
        type: Number,
        required: true,
    },
    service_description: {
        type: String,
        required: true,
    },
    time: {
        type: String,
        required: true,
    },
    date: {
        type: String,
        required: true,
    },
    phone_number: {
        type: String,
        default: null,
    },
    payment_mode: {
        type: String,
        default: null,
    },
    payment_method: {
        type: String,
        default: null,
    },
    description: {
        type: String,
        default: null,
    },
    reference: {
        type: String,
        default: null,
    },
    status: {
        type: String,
        default: null,
    },
    order_tracking_id: {
        type: String,
        default: null,
    },
    OrderNotificationType: {
        type: String,
        default: null,
    },
});
module.exports = mongoose.model("payment", paymentSchema);
