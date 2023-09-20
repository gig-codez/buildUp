const { default: mongoose } = require("mongoose");
const paymentModel = new mongoose.Schema({
    freelancer: {
        type: mongoose.Types.ObjectId,
        required: true,
    },
    employer: {
        type: mongoose.Types.ObjectId,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    date_time: {
        type: String,
        required: true,
    },
});
module.exports = mongoose.model("payment", paymentModel);
