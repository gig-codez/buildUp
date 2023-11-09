const freelancerModel = require("../models/freelancer.model");
const SupplierModel = require("../models/Supplier.model");
const EmployerModel = require("../models/Employer.model");
const mailSender = require("../utils/mailSender.js");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

class Password {
  static async forgotPassword(req, res) {
    try {
      let user, userType;
      // Finding the user based on different models
      if (req.body.email) {
        user = await freelancerModel.findOne({ email: req.body.email });
        userType = "Freelancer";
      } else if (req.body.business_email_address) {
        user = await SupplierModel.findOne({
          business_email_address: req.body.business_email_address,
        });
        userType = "Supplier";
      } else if (req.body.email_address) {
        user = await EmployerModel.findOne({
          email_address: req.body.email_address,
        });
        userType = "Employer";
      }

      if (!user) {
        return res.status(400).json({ message: `Wrong ${userType} email` });
      }

      const resetToken = user.createResetPasswordToken();
      user.passwordResetToken = resetToken;
      user.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

      await user.save({ validateBeforeSave: false });

      const resetUrl = `${req.protocol}://${req.get(
        "host"
      )}/update/resetPassword/${resetToken}`;
      const message = `We have received a password reset request for your ${userType} account. Please use the link to reset your password:\n\n${resetUrl}\n\nThis password reset link is valid for 10 minutes.`;

      try {
        if (userType === "Employer") {
          await mailSender(
            user.email_address,
            "Password Change Request",
            message
          );
        } else if (userType === "Freelancer") {
          await mailSender(user.email, "Password Change Request", message);
        } else if (userType === "Supplier") {
          await mailSender(
            user.business_email_address,
            "Password Change Request",
            message
          );
        }

        return res.status(200).json({
          status: "Success",
          message: "Password reset link was successfully sent",
        });
      } catch (error) {
        user.passwordResetToken = undefined;
        user.passwordResetTokenExpires = undefined;
        await user.save({ validateBeforeSave: false });
        return res.status(500).json({
          success: false,
          error: "Error sending the email for password reset",
        });
      }
    } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async resetPassword(req, res) {
    try {
      const token = req.params.token;

      let user, userType;

      user = await EmployerModel.findOne({
        passwordResetToken: token,
        passwordResetTokenExpires: { $gt: Date.now() },
      });

      if (!user) {
        user = await freelancerModel.findOne({
          passwordResetToken: token,
          passwordResetTokenExpires: { $gt: Date.now() },
        });

        if (user) {
          userType = "Freelancer";
        } else {
          user = await SupplierModel.findOne({
            passwordResetToken: token,
            passwordResetTokenExpires: { $gt: Date.now() },
          });

          if (user) {
            userType = "Supplier";
          }
        }
      } else {
        userType = "Employer";
      }

      if (!user) {
        return res.status(404).json("Invalid token or token has expired");
      }

      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      user.password = hashedPassword;
      user.confirmPassword = hashedPassword;
      user.passwordResetToken = undefined;
      user.passwordResetTokenExpires = undefined;
      user.passwordChangedAt = Date.now();

      await user.save();

      let tokenn = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
        expiresIn: "1h",
      });
      res.status(200).json({ tokenn, userType });
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
module.exports = Password;
