const jwt = require("jsonwebtoken");
const adminModel = require("./../models/admin.model");
require("dotenv").config();
const bcrypt = require("bcrypt");
class AdminLogin {
  static async login(req, res) {
    try {
      const userAccount = await adminModel.findOne({ email: req.body.email });
      if (userAccount) {
        let isMatch = bcrypt.compareSync(
          req.body.password,
          userAccount.password
        );
        let token = jwt.sign({ id: userAccount._id }, process.env.SECRET_KEY, {
          expiresIn: "1h",
        });
        if (isMatch) {
          res.status(200).json({
            token: token,
            userId: userAccount._id,
            name: userAccount.name,
            email: userAccount.email,
          });
        } else {
         return res.status(401).json({ message: "Invalid email or password" });
        }
      } else {
       return res.status(400).json({ message: "No user founds" });
      }
    } catch (error) {
     return res.status(500).json({ message: error.message });
    }
  }
}

module.exports = AdminLogin;
