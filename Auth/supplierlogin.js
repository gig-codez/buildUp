const supplierModel = require("../models/supplier.model.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

class SupplierLogin {
  static async loginHelper(req) {
    const supplier = await supplierModel.findOne({
      business_email_address: req.body.email,
    });
    if (supplier) {
      if (supplier.active === false) {
        let error = new Error("Account is inactive, please contact admin");
        error.code = 401;
        throw error;
      } if (supplier.emailVerified === false) {
        let error = new Error("Please verify your email to proceed with business. Check your email for further instructions");
        error.code = 400;
        throw error;
      }

      let isMatch = bcrypt.compareSync(req.body.password, supplier.password);
      let token = jwt.sign({ id: supplier._id }, process.env.SECRET_KEY, {
        expiresIn: "1h",
      });
      if (isMatch) {
        return {
          token: token,
          userId: supplier._id,
          first_name: supplier.business_name,
          email: supplier.business_email_address,
          userData: supplier,
          role: "supplier",
        };
      } else {
        let error = new Error("Invalid email or password");
        error.code = 401;
        throw error;
      }
    } else {
      let error = new Error("Invalid details");
      error.code = 401;
      throw error;
    }
  }

  static async login(req, res) {
    try {
      let respMessage = await SupplierLogin.loginHelper(req);
      res.status(200).json(respMessage);
    } catch (error) {
      res
        .status(error.hasOwnProperty("code") ? error.code : 500)
        .json({ message: error.message });
    }
  }
}
module.exports = SupplierLogin;
