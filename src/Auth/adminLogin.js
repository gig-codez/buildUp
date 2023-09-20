const jwt = require("jsonwebtoken");
const adminModel = require("./../models/admin.model");
const bcrypt = require("bcrypt");
class AdminLogin {
  static async login(req, res, next) {
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
                email: userAccount.email
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

module.exports = AdminLogin;
