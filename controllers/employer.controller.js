const employerModel = require("../models/employer.model.js");
const bcrypt = require("bcrypt");
const EmployerLogin = require("../Auth/employerlogin");
require("dotenv").config();
const speakeasy = require("speakeasy");
const send_mail_verification = require("../utils/send_mail_verification.js");
const jwt = require("jsonwebtoken");
const OtpController = require("./otpController.js");
const freelancerModel = require("../models/freelancer.model.js");
const { response } = require("express");
const supplierModel = require("../models/supplier.model.js");

class EmployerController {
  static async getAll(req, res) {
    try {
      // ADDING PAGINATION FUNCTIONALITY
      const page = parseInt(req.query.page) || 1; // Default to page 1 if page query param is not provided
      const pageSize = parseInt(req.query.pageSize) || 10; // Default page size to 10 if pageSize query param is not provided
      const totalDocuments = await employerModel
        .find()
        .countDocuments();
      const totalPages = Math.ceil(totalDocuments / pageSize);
      // Calculate the number of documents to skip
      const skipDocuments = (page - 1) * pageSize;
      const employers = await employerModel
        .find()
        .sort({ _id: -1 })
        .populate("business", "business_name");
      if (!employers) {
        return res.status(404).json({
          message: "No employers found"
        });
      }

      return res.status(200).json({
        totalDocuments,
        totalPages,
        currentPage: page,
        pageSize,
        employers,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: error.message });
    }
  }
  static async notPaginated(req, res) {
    try {
      const employers = await employerModel.find().populate("business");
      if (!employers) {
        return res.status(404).json({ message: "No employers found" });
      }
      return res.status(200).json(employers);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: error.message });
    }
  }
  static async getEmployerById(req, res) {
    try {
      const employer = await employerModel
        .findOne({ _id: req.params.id })
        .populate("business");

      if (employer) {
        return res.status(200).json({ data: employer });
      } else {
        return res.status(400).json({ message: "No employer found" });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: error.message });
    }
  }
  static async storeEmployer(req, res) {

    try {
      // var secret = speakeasy.generateSecret();
      const short_code = speakeasy.totp({
        secret: "secret",
        encoding: "base32",
        window: 5,
      })
      const employerData = await employerModel.findOne({
        email_address: req.body.email_address,
      });
      const freelance = await freelancerModel.findOne({
        email_address: req.body.email_address
      });
      const supplier = await supplierModel.findOne({
        business_email_address: req.body.email_address,
      });
      // check if email used by supplier
      if (supplier) {
        return res.status(200).json({ message: "Email already exists" });
      }
      // check if email used by freelancer
      if (freelance) {
        return res.status(200).json({ message: "Email already exists" });
      }
      // check if email used by employer
      if (employerData) {
        res.status(400).json({ message: "Employer already exists" });
      } else {
        bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
          if (err) {
            res.status(500).json({ message: err });
          } else {
            const employerPayload = new employerModel({
              first_name: req.body.first_name,
              last_name: req.body.last_name,
              password: hashedPassword,
              email_address: req.body.email_address,
              phone: req.body.phone,
              country: req.body.country,
              role: req.body.role,
              otp: short_code,
            });
            const newEmployee = await employerPayload.save();
            // login the employer
            OtpController.sendMailVerification({
              email: req.body.email_address,
              userId: newEmployee._id,
            });
            // send otp msg
            OtpController.otpMsg({
              name: req.body.first_name,
              phone: req.body.phone,
              code: short_code,
            });

            res.status(200).json({
              message: "Employer created successfully",
              data: newEmployee,

            });
          }
        });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  static async store(req, res) {
    try {
      const employer = await employerModel.findByIdAndUpdate(
        req.params.id,
        {
          first_name: req.body.first_name,
          last_name: req.body.last_name,
          email_address: req.body.email_address,
          TIN_NIN: req.body.TIN_NIN,
          country: req.body.country,
        },
        { new: true }
      );
      if (!employer) {
        return res.status(404).json({ message: "Employer not found" });
      }
      // Hash the password
      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      // Update the password
      employer.password = hashedPassword;
      await employer.save();

      return res.status(200).json({
        message: "Employer updated successfully",
        data: employer,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  // update employer model
  static async update(req, res) {
    try {
      const employer = await employerModel.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!employer) {
        return res.status(404).json({ message: "Employer not found" });
      }
      return res.status(200).json({
        message: "Employer updated successfully",
        data: employer,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  // update employer password
  static async updatePassword(req, res) {
    try {
      const employer = await employerModel.findById(req.params.id);
      if (!employer) {
        return res.status(404).json({ message: "Employer not found" });
      }
      // Hash the password
      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      // Update the password
      employer.password = hashedPassword;
      await employer.save();

      return res.status(200).json({
        message: "Employer password updated successfully",
        data: employer,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

}
module.exports = EmployerController;
