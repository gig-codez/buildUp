const { Schema, model } = require("mongoose");

const withdrawSchema = new Schema({
    amount: {
        type: String,
        required: true
    },
    bank: {
        type: String,
        required: true
    },
    recipient: {
        type: String,
        required: false,
        default: "",
    },
    cleared: {
        type: Boolean,
        required: false,
        default: false,
    },
    approved: {
        type: Boolean,
        required: false,
        default: false,
    },
    account_number: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: false,
        default: '',
    },
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'employer',
        required: false,
    },
    contractor: {
        type: Schema.Types.ObjectId,
        ref: 'freelancer',
        required: false,
    },
    supplier: {
        type: Schema.Types.ObjectId,
        ref: 'supplier',
        required: false,
    }
}, {
    timestamps: true
});

module.exports = model('withdraws', withdrawSchema);