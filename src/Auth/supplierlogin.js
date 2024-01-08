const supplierModel = require("../models/Supplier.model.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

class SupplierLogin {
  static async loginHelper(req) {
    const supplier = await supplierModel.findOne({
      business_email_address: req.body.email_address,
    });
    console.log(supplier);
    if (supplier) {
      let isMatch = bcrypt.compareSync(req.body.password, supplier.password);
      let token = jwt.sign({ id: supplier._id }, process.env.SECRET_KEY, {
        expiresIn: "1h",
      });
      if (isMatch) {
        return {
          token: token,
          userId: supplier._id,
          first_name: supplier.first_name,
          email: supplier.business_email_address,
          role: "supplier",
        };
      } else {
        let error = new Error("Invalid email or password");
        error.code = 401;
        throw error;
      }
    } else {
      let error = new Error("invalid details");
      error.code = 401;
      throw error;
    }
  }

  static async login(req, res) {
    try {
      let respMessage = await SupplierLogin.loginHelper(req);
      res.status(200).json(respMessage);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}
module.exports = SupplierLogin;
