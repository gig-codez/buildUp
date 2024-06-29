const { Schema, Types, model } = require("mongoose");

const proposalSchema = new Schema({
    sender: {
        type: Types.ObjectId,
        ref: 'employer',
        required: true,
    }, recipients: [{
        type: Types.ObjectId,
        ref: 'contractor',
        required: true,
    }], subject: {
        type: String,
        required: true,
    }, body: {
        type: String,
        required: true,
    }, status: {
        type: String,
        enum: ['sent', 'accepted', 'declined'],
        default: 'sent',
    }
}, {
    timestamps: true,
});

module.exports = model("proposal", proposalSchema);