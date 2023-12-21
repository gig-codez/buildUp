const { default: mongoose } = require("mongoose");
const paymentModel = new mongoose.Schema({
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
});
module.exports = mongoose.model("payment", paymentModel);
