const EmployerModel = require("../models/employer.model.js");
const businessModel = require("../models/business.model.js");
require("dotenv").config();
const speakeasy = require("speakeasy");
const send_mail_verification = require("../utils/send_mail_verification.js");
const jwt = require("jsonwebtoken");

class BusinessController {
  static async getAll(req, res) {
    try {
      // ADDING PAGINATION FUNCTIONALITY
      const page = parseInt(req.query.page) || 1; // Default to page 1 if page query param is not provided
      const pageSize = parseInt(req.query.pageSize) || 10; // Default page size to 10 if pageSize query param is not provided
      const totalDocuments = await businessModel
        .find({})
        .countDocuments();
      const totalPages = Math.ceil(totalDocuments / pageSize);
      // Calculate the number of documents to skip
      const skipDocuments = (page - 1) * pageSize;
      let business = await businessModel
        .find({})
        .populate("employer", "first_name");
      res.status(200).json({ data: business });
    } catch (error) {
      res.status(500).json({
        totalDocuments,
        totalPages,
        currentPage: page,
        pageSize, message: error.message
      });
    }
  }
  static async store(req, res) {
    if (!req.body.employer) req.body.employer = req.params.id;
    var secret = speakeasy.generateSecret();
    // Generate a new short-code with a 5-minute expiration time
    const short_code = speakeasy.totp({
      secret: secret,
      encoding: "base32",
      window: 2, // OTP valid for 2 minutes
    });
    try {
      const businessData = await businessModel.findOne({
        business_email: req.body.business_email,
      });

      if (businessData) {
        return res.status(400).json({ message: "Business already exists" });
      } else {
        businessData.otp = short_code;
        await businessData.save();
        const businessPayload = new businessModel(req.body);
        const newBusiness = await businessPayload.save();
        res.status(200).json({
          message: "business created successfully",
          data: newBusiness,
        });
        await EmployerModel.findByIdAndUpdate(req.body.employer, {
          $set: { business: newBusiness._id },
        });
        // login the employer
        // send email verification link to employer
        const token = jwt.sign({ email: req.body.business_email }, '02_5k001tym_3202',
          {
            expiresIn: '1h' // 2minutes
          });
        await send_mail_verification(req.body.business_email,
          `https://build-up.vercel.app/verify-email/${token}/${newBusiness._id}`,
          "Kindly click the link below to verify your email address.",
        );
        // send sms otp
        // Set your app credentials
        const credentials = {
          apiKey: process.env.AFRIKA_API_KEY,
          username: process.env.AFRIKA_USERNAME,
        };
        const AfricasTalking = require("africastalking")(credentials);
        const sms = AfricasTalking.SMS;
        const options = {
          // Set the numbers you want to send to in international format
          to: `+256${newBusiness.business_tel}`,
          message: `Dear ${newBusiness.business_name}, Your OTP is  ${short_code}. It will expire in 2 minutes`,
        };
        sms
          .send(options)
          .then((response) => {
            console.log(response);
          });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  static async updateBusiness(req, res) {
    try {
      const updatedBusiness = await businessModel.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );

      if (!updatedBusiness) {
        return res.status(404).json({ message: "Business not found" });
      }

      res.status(200).json({
        message: "Business updated successfully",
        data: updatedBusiness,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }
  static async getBusinessById(req, res) {
    try {
      const business = await businessModel.findById(req.params.id);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      res.status(200).json({ data: business });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }
  static async deleteBusiness(req, res) {
    try {
      const businessId = req.params.id;
      const deletedBusiness = await businessModel.findByIdAndDelete(businessId);

      if (!deletedBusiness) {
        return res.status(404).json({ message: "Business not found" });
      }
      const employerId = deletedBusiness.employer;
      await EmployerModel.findByIdAndUpdate(employerId, {
        $pull: { business: businessId },
      });

      res.status(200).json({ message: "Business deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }
}
module.exports = BusinessController;
