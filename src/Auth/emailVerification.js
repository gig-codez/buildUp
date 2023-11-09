const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const adminModel = require("../models/admin.model");
// const employerModel = require("../models/employer.model");
require("dotenv").config();
//
class AccountVerification {
  // function to verify email
  static async verifyEmail(req, res, next) {
    try {
      let email = req.body.email;
      let auth = {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
      };
      console.log(auth);
     
      const user = adminModel.findOne({ email_address: email });
      // const employer = employerModel.findOne({ email: email });
      if (!user) {
        res.status(400).json({ message: "Email already exists" });
      } else {
        const token = jwt.sign(
          { email_address: email },
          process.env.SECRET_KEY,
          {
            expiresIn: "1m",
          }
        );
        const link = `http://127.0.0.1:4000/get/verifyToken/${token}`;
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD,
          },
        });
        const mailOptions = {
          from: process.env.EMAIL,
          to: email,
          subject: "Verify that it's you",
          html: `<h2>Please click on given link to verify your email</h2>
                <a href=${link}>${link}</a>`,
        };
        transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            res.status(500).json({ mail_error: err });
          } else {
            res
              .status(200)
              .json({ message: `Email sent successfully => ${info}` });
          }
        });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  static async verifyToken(req, res) {
    try {
      // console.log(req.params.id);
      if (req.params.id) {
        jwt.verify(req.params.id, process.env.SECRET_KEY, (err, decoded) => {
          if (err) {
            res.status(400).json({ message: "Invalid token" });
          } else {
            res
              .status(200)
              .json({ message: `Token verified successfully => ${decoded}` });
          }
        });
      }
    } catch (error) {
      res.status(500).json({ message: `Error ${error.message}` });
    }
  }
}

module.exports = AccountVerification;
