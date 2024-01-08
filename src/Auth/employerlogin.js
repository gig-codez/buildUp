const employerModel = require("../models/Employer.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

class EmployerLogin {
  static async loginHelper(req){
    const employer = await employerModel.findOne({
      email_address: req.body.email,
    });
    if (employer) {
      let isMatch = bcrypt.compareSync(req.body.password, employer.password);
      let token = jwt.sign({ id: employer._id }, process.env.SECRET_KEY, {
        expiresIn: "1h",
      });
      if (isMatch) {
        return {
          token: token,
          userId: employer._id,
          first_name: employer.first_name,
          email: employer.email_address,
          role: "client"
        };
      } else {
        let error = new Error("Invalid email or password");
        error.code = 401;
        throw error;
      }
    }
  }


  static async login(req, res) {
    try {
      let respMessage = await EmployerLogin.loginHelper(req);
      res.status(200).json(respMessage);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}
module.exports = EmployerLogin;
