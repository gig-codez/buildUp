const employerModel = require("../models/employer.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

class EmployerLogin {
  static async loginHelper(req) {
    const employer = await employerModel.findOne({
      email_address: req.body.email, emailVerified: true,
    });
    if (employer) {
      if (employer.active === false || employer.emailVerified === false) {
        let error = new Error("Account is not activated, please check your email for activation link.");
        error.code = 401;
        throw error;
      }
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
          userData: employer,
          role: "client"
        };
      } else {
        let error = new Error("Invalid email or password");
        error.code = 401;
        throw error;
      }
    } else {
      let error = new Error("Email not verified!!");
      error.code = 401;
      throw error;
    }
  }

  static async login(req, res) {
    try {
      let respMessage = await EmployerLogin.loginHelper(req);
      res.status(200).json(respMessage);
    } catch (error) {
      res
        .status(error.hasOwnProperty("code") ? error.code : 500)
        .json({ message: error.message });
    }
  }
}
module.exports = EmployerLogin;
