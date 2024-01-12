// controllers/otpController.js
const otpGenerator = require("otp-generator");
const otpModel = require("../models/otp.model");
const freelancerModel = require("../models/freelancer.model");
const SupplierModel = require("../models/Supplier.model");
const EmployerModel = require("../models/employer.model");

class OtpController {
  static async sendOTP(req, res) {
    try {
      const { email, business_email_address, email_address } = req.body;
      // Check if user is already present
      const checkUserPresent = await freelancerModel.findOne({ email });
      const checkSupplier = await SupplierModel.findOne({
        business_email_address,
      });
      const checkEmployer = await EmployerModel.findOne({ email_address });
      // If user found with provided email
      if (checkUserPresent || checkSupplier || checkEmployer) {
        return res.status(401).json({
          success: false,
          message: "User is already registered",
        });
      }

      let otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      });
      let result = await otpModel.findOne({ otp: otp });
      while (result) {
        otp = otpGenerator.generate(6, {
          upperCaseAlphabets: false,
        });
        result = await otpModel.findOne({ otp: otp });
      }
      const otpPayload = { email, otp };
      const otpBody = await otpModel.create(otpPayload);
      res.status(200).json({
        success: true,
        message: "OTP sent successfully",
        otpBody,
      });
    } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}
module.exports = OtpController;
