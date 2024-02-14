const freelancerModel = require("../models/freelancer.model");
const SupplierModel = require("../models/supplier.model");
const EmployerModel = require("../models/employer.model");
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

      const resetToken = crypto.randomBytes(20).toString("hex"); // Creates a 40-character hex string

      // Setting the reset token and expiration
      user.passwordResetToken = resetToken;
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

      const employer = await EmployerModel.findOne({
        passwordResetToken: token,
        passwordResetTokenExpires: { $gt: Date.now() },
      });

      if (employer) {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        employer.password = hashedPassword;
        employer.confirmPassword = hashedPassword;
        employer.passwordResetToken = undefined;
        employer.passwordResetTokenExpires = undefined;
        employer.passwordChangedAt = Date.now();

        await employer.save();

        let token = jwt.sign({ id: employer._id }, process.env.SECRET_KEY, {
          expiresIn: "1h",
        });
        res.status(200).json({ token, userType: "Employer" });
      } else {
        const freelancer = await FreelancerModel.findOne({
          passwordResetToken: token,
          passwordResetTokenExpires: { $gt: Date.now() },
        });

        if (freelancer) {
          const hashedPassword = await bcrypt.hash(req.body.password, 10);
          freelancer.password = hashedPassword;
          freelancer.confirmPassword = hashedPassword;
          freelancer.passwordResetToken = undefined;
          freelancer.passwordResetTokenExpires = undefined;
          freelancer.passwordChangedAt = Date.now();

          await freelancer.save();

          let token = jwt.sign({ id: freelancer._id }, process.env.SECRET_KEY, {
            expiresIn: "1h",
          });
          res.status(200).json({ token, userType: "Freelancer" });
        } else {
          const supplier = await SupplierModel.findOne({
            passwordResetToken: token,
            passwordResetTokenExpires: { $gt: Date.now() },
          });

          if (supplier) {
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            supplier.password = hashedPassword;
            supplier.confirmPassword = hashedPassword;
            supplier.passwordResetToken = undefined;
            supplier.passwordResetTokenExpires = undefined;
            supplier.passwordChangedAt = Date.now();

            await supplier.save();

            let token = jwt.sign({ id: supplier._id }, process.env.SECRET_KEY, {
              expiresIn: "1h",
            });
            res.status(200).json({ token, userType: "Supplier" });
          } else {
            return res.status(404).json("Invalid token or token has expired");
          }
        }
      }
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
module.exports = Password;
