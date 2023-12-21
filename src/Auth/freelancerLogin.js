const freelancerModel = require("../models/freelancer.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

class FreelancerLogin {
  static async login(req, res) {
    try {
      const freelancer = await freelancerModel.findOne({
        email: req.body.email,
      });
      console.log(freelancer);
      if (freelancer) {
        let isMatch = bcrypt.compareSync(
          req.body.password,
          freelancer.password
        );
        let token = jwt.sign({ id: freelancer._id }, process.env.SECRET_KEY, {
          expiresIn: "1h",
        });
        if (isMatch) {
          res.status(200).json({
            token: token,
            userId: freelancer._id,
            first_name: freelancer.first_name,
            email: freelancer.email,
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
module.exports = FreelancerLogin;
