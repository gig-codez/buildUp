const { Schema, model } = require("mongoose");

const withdrawSchema = new Schema({
    amount: {
        type: Number,
        required: true
    },
    bank: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: false,
        default: 'pending'
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