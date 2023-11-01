const employerModel = require("../models/Employer.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

class employerlogin {
  static async login(req, res) {
    try {
      const employer = await employerModel.findOne({
        email_address: req.body.email_address,
      });
      if (employer) {
        let isMatch = bcrypt.compareSync(req.body.password, employer.password);
        let token = jwt.sign({ id: employer._id }, process.env.SECRET_KEY, {
          expiresIn: "1h",
        });
        if (isMatch) {
          res.status(200).json({
            token: token,
            userId: employer._id,
            first_name: employer.first_name,
            email_address: employer.email_address,
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
module.exports = employerlogin;
