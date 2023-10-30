const supplierModel = require("../models/Supplier.model.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

class SupplierLogin {
  static async login(req, res) {
    try {
      const supplier = await supplierModel.findOne({
        email: req.body.email,
      });
      if (supplier) {
        let isMatch = bcrypt.compareSync(req.body.password, supplier.password);
        let token = jwt.sign({ id: supplier._id }, process.env.SECRET_KEY, {
          expiresIn: "1h",
        });
        if (isMatch) {
          res.status(200).json({
            token: token,
            userId: supplier._id,
            name: supplier.name,
            email: supplier.email,
          });
        } else {
          res.status(401).json({ message: "Invalid email or password" });
        }
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}
module.exports = SupplierLogin;
