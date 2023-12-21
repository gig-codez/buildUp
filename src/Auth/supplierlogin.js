const supplierModel = require("../models/Supplier.model.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

class SupplierLogin {
  static async login(req, res) {
    try {
      const supplier = await supplierModel.findOne({
        business_email_address: req.body.business_email_address,
      });
      console.log(supplier);
      if (supplier) {
        let isMatch = bcrypt.compareSync(req.body.password, supplier.password);
        let token = jwt.sign({ id: supplier._id }, process.env.SECRET_KEY, {
          expiresIn: "1h",
        });
        if (isMatch) {
          res.status(200).json({
            token: token,
            userId: supplier._id,
            first_name: supplier.first_name,
            business_email_address: supplier.business_email_address,
          });
        } else {
          res.status(401).json({ message: "Invalid email or password" });
        }
      } else {
        res.status(401).json({ message: "invalid details" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}
module.exports = SupplierLogin;
