const freelancerModel = require("../models/freelancer.model");
const SupplierModel = require("../models/Supplier.model");
const EmployerModel = require("../models/Employer.model");
const mailSender = require("../utils/mailSender.js");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

class Password {
  static async forgotPassword(req, res) {
    const { email, business_email_address, email_address } = req.body;
    try {
      //am getting the user based ion email
      const checkUserPresent = await freelancerModel.findOne({ email });
      const checkSupplier = await SupplierModel.findOne({
        business_email_address,
      });
      const checkEmployer = await EmployerModel.findOne({ email_address });
      if (!checkEmployer) {
        res.status(400).json({ message: "wrong  email" });
      }

      //am checking if the email passedin exists
      //   if (!checkUserPresent || !checkSupplier || !checkEmployer) {
      //     return res.status(401).json({
      //       success: false,
      //       message: "Couldnt find the user with given email..!",
      //     });
      //   }
      //lets generate the the token using crypto w/c isin built
      const resetToken = checkEmployer.createResetPasswordToken();
      await checkEmployer.save({ validateBeforeSave: false });

      //send the token back to the user emaill
      const reseturl = `${req.protocol}://${req.get(
        "host"
      )}/update/resetPassword/${resetToken}`;

      const message = `We have received a password reset request .Please use the below link to reset your password\n\n${reseturl}\n\nThis reset password link valid only for 10 minutes`;

      try {
        await mailSender(email_address, "Password change request", message);
        res.status(200).json({
          status: "Success",
          message: "Password reset link was successfully sent",
        });
      } catch (error) {
        checkEmployer.passwordResetToken = undefined;
        checkEmployer.passwordResetTokenExpires = undefined;
        checkEmployer.save({ validateBeforeSave: false });
      }
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async resetPassword(req, res) {
    //checking for the token..!
    const token = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");
    console.log(token);
    const employer = await EmployerModel.findOne({
      passwordResetToken: token,
      passwordResetTokenExpires: { $gt: Date.now() },
    });
    console.log(employer);
    if (!employer) {
      return res.status(404).json("Invalid token or token has expired ");
    }

    employer.password = req.body.password;
    employer.confirmPassword = req.body.confirmPassword;
    employer.passwordResetToken = undefined;
    employer.passwordResetTokenExpires = undefined;
    employer.passwordChangedAt = Date.now();

    employer.save();
    //login the user automatically
    let tokenn = jwt.sign({ id: employer._id }, process.env.SECRET_KEY, {
      expiresIn: "1h",
    });
    res.status(200).json({
      token: tokenn,
    });
  }
}
module.exports = Password;
