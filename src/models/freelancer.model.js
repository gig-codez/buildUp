const { default: mongoose } = require("mongoose");

const freelancerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: false,
    default: "",
    },
    first_name: {
        type: String,
        required:true,
    }, last_name: {
        type: String,
        required:true,
    }, email: {
        type: String,
        required:true,
    }, password: {
        type: String,
        required: false,
        default:''
    }, gender: {
        type: String,
        required:true,
    }, dob: {
        type: String,
        required:true,
    }, tel_no: {
        type: Number,
        required:true,
    }
});

module.exports = mongoose.model("freelancer", freelancerSchema);
