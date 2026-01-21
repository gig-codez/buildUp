// controllers/otpController.js
const freelancerModel = require("../models/freelancer.model");
const businessModel = require("../models/business.model");
require("dotenv").config();
const speakeasy = require("speakeasy");
const supplierModel = require("../models/supplier.model");
const send_mail_verification = require("../utils/send_mail_verification");
const jwt = require("jsonwebtoken");
const employerModel = require("../models/employer.model");
const sendSms = require("../services/SmsService");
const notificationsModel = require("../models/notifications.model");
const mailSender = require("../utils/mailSender");

class OtpController {
  static async sendOTP(req, res) {
    try {
      const { phone } = req.body;

      // Check all models sequentially
      const freelancer = await freelancerModel.findOne({ tel_num: phone });
      if (freelancer) {
        // Generate a 6 digit OTP
        const otpCode = speakeasy.totp({
          secret: "secret",
          encoding: "base32",
          window: 5, // OTP valid for 5 minutes
        });
        await OtpController.otpMsg({
          name: freelancer.first_name,
          phone: phone,
          code: otpCode,
        })
        freelancer.active = true;
        freelancer.otp = otpCode;
        await freelancer.save();
        return res.status(200).json({ message: "OTP sent  successfully" });
      }

      const supplier = await supplierModel.findOne({ otp });
      if (supplier) {
        // Generate a 6 digit OTP
        const otpCode = speakeasy.totp({
          secret: "secret",
          encoding: "base32",
          window: 5, // OTP valid for 5 minutes
        });
        await OtpController.otpMsg({
          name: supplier.business_name,
          phone: phone,
          code: otpCode,
        })
        supplier.active = false;
        supplier.otp = otpCode;
        await supplier.save();
        return res.status(200).json({ message: "OTP sent  successfully" });
      }

      const employer = await employerModel.findOne({ otp });
      if (employer) {
        // Generate a 6 digit OTP
        const otpCode = speakeasy.totp({
          secret: "secret",
          encoding: "base32",
          window: 5, // OTP valid for 5 minutes
        });
        await OtpController.otpMsg({
          name: employer.business_name,
          phone: phone,
          code: otpCode,
        })
        employer.otp = otpCode;
        employer.active = false;
        await employer.save();
        return res.status(200).json({ message: "OTP sent successfully" });
      }

      // If no matching OTP found in any model
      return res.status(400).json({ message: "The provided number doesn't match our records" });
    } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
  // function to verify otp using speakeasy
  static async verifyOtp(req, res) {
    try {
      const { otp } = req.body;

      // Check all models sequentially
      const freelancer = await freelancerModel.findOne({ otp });
      if (freelancer) {
        freelancer.active = true;
        freelancer.otp = "0";
        await freelancer.save();
        return res.status(200).json({ message: "Account verified successfully" });
      }

      const supplier = await supplierModel.findOne({ otp });
      if (supplier) {
        supplier.active = true;
        supplier.otp = "0";
        await supplier.save();
        return res.status(200).json({ message: "Account verified successfully" });
      }

      const employer = await employerModel.findOne({ otp });
      if (employer) {
        employer.active = true;
        employer.otp = "0";
        await employer.save();
        return res.status(200).json({ message: "Account verified successfully" });
      }

      // If no matching OTP found in any model
      return res.status(400).json({ message: "OTP expired or invalid" });

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
  /** 
   * @params {Object} { name, phone, code}
   */
  static async otpMsg(data) {
    // send otp message to the user
    // Set your app credentials
    // const credentials = {
    //   apiKey: process.env.AFRIKA_API_KEY,
    //   username: process.env.AFRIKA_USERNAME,
    // };
    // const tel = "";
    // Remove leading 0 if it exists

    // }
    // const AfricasTalking = require("africastalking")(credentials);
    // const sms = AfricasTalking.SMS;
    const options = {
      // Set the numbers you want to send to in international format
      to: data.phone,
      message: `Dear ${data.name}, Your BuildUp OTP code is ${data.code}.`,
    };
    console.log(options);
    await sendSms(parseInt(options.to), options.message);
  }
  async fetchSavedNotifications(req, res) {
    try {
      const notifications = await notificationsModel.find();
      return res.status(200).json(notifications);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // send custom message
  static async customMsg(data) {
    // send custom message to the user
    // Set your app credentials
    // const credentials = {
    //   apiKey: process.env.AFRIKA_API_KEY,
    //   username: process.env.AFRIKA_USERNAME,
    // };
    // const AfricasTalking = require("africastalking")(credentials);
    // const sms = AfricasTalking.SMS;
    const options = {
      // Set the numbers you want to send to in international format
      to: `${data.phone}`,
      message: data.message,
    };
    // record the notification sent
    const saveNotify = new notificationsModel({
      message: data.message,
      phone: data.phone,
    });
    await saveNotify.save();
    await sendSms(parseInt(options.to), options.message);
  }
  // function to send email verification link
  static async sendEmailVerification(req, res) {
    try {
      const { email } = req.body;
      // check user email from supplier, employer, freelancer
      const supplier = await supplierModel.findOne({ business_email_address: email });
      if (supplier) {
        // send email verification link to supplier
        OtpController.sendMailVerification({ email: email, userId: supplier._id });
        return res.status(200).json({ message: "Email verification link sent successfully" });
      }
      // check if employer email exists
      const employer = await employerModel.findOne({ email_address: email });
      if (employer) {
        // send email verification link to employer
        OtpController.sendMailVerification({ email: email, userId: employer._id });
        return res.status(200).json({ message: "Email verification link sent successfully" });
      }
      // check if freelancer email exists
      const freelancer = await freelancerModel.findOne({ email: email });
      if (freelancer) {
        // send email verification link to freelancer
        OtpController.sendMailVerification({ email: email, userId: freelancer._id });
        return res.status(200).json({ message: "Email verification link sent successfully" });
      }
      return res.status(400).json({ message: "The provided email doesn't match our records" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  }

  // function handling forgot password
  static async forgotPassword(req, res) {
    try {
      // check user email from supplier, employer, freelancer
      const { email } = req.body;
      const supplier = await supplierModel.findOne({ business_email_address: email });
      if (supplier) {
        // send reset password link to supplier
        OtpController.sendMail({ email: email, userId: supplier._id });
        return res.status(200).json({ message: "Reset password link sent successfully" });
      }
      // check if employer email exists
      const employer = await employerModel.findOne({ email_address: email });
      if (employer) {
        // send reset password link to employer
        OtpController.sendMail({ email: email, userId: employer._id });
        return res.status(200).json({ message: "Reset password link sent successfully" });
      }
      // check if freelancer email exists
      const freelancer = await freelancerModel.findOne({ email: email });
      if (freelancer) {
        // send reset password link to freelancer
        OtpController.sendMail({ email: email, userId: freelancer._id });
        return res.status(200).json({ message: "Reset password link sent successfully" });
      }
      return res.status(400).json({ message: "The provided email doesn't match our records" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  }
  // function to send email password reset link
  static async sendMail(data) {
    try {
      // send email verification link to employer
      const token = jwt.sign(
        { email: data.email },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "1h" }  // Use a string to represent 60 seconds
      );
      await mailSender(data.email,
        "Password Reset",
        mailTemplate(
          "Password Reset",
          `https://server.buildupuganda.com/auth/passwordReset/${token}/${data.userId}`,  //
          "Kindly click the link below to reset your password.",
        )
        ,
      );
    } catch (error) {
      console.log(error);
    }

  }
  // function to send email verification.
  static async sendMailVerification(data) {
    // send email verification link to employer
    const token = jwt.sign(
      { email: data.email },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" }  // Use a string to represent 60 seconds
    );
    await send_mail_verification(data.email,
      `https://server.buildupuganda.com/auth/verify-email/${token}/${data.userId}`,
      "Kindly click the link below to verify your email address.",
    );
  }
}
module.exports = OtpController;
