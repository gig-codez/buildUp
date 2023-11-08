// const { verify } = require("jsonwebtoken");
const otpModel = require("../models/otp.model");

class VerifyOtp {
  static async verify(req, res) {
    const { email, otp } = req.body;
    try {
      const response = await otpModel
        .find({ email })
        .sort({ createdAt: -1 })
        .limit(1);

      if (response.length > 0) {
        const latestOtp = response[0].otp;

        if (latestOtp !== otp) {
          return res.status(400).json({
            success: false,
            message: "The OTP is not valid",
          });
        } else {
          return res.status(200).json({
            success: true,
            message: "The OTP is correct",
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: "No OTP found for the given email",
        });
      }
    } catch (error) {
      return res.status(500).json({ message: "Error occurred", error });
    }
  }
}

module.exports = VerifyOtp;
