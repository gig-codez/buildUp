const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const adminModel = require("../models/admin.model");
const employerModel = require("../models/employer.model");
require("dotenv").config();
// 
class AccountVerification {
  // function to verify email
  static async verifyEmail(req, res, next) {
    try {
      const email = req.body.email;
      //  first if the email provided exists in any of the user modules
      //  if it does, then send an email to the user to verify the email
      //  if it doesn't, then send an error message
        const user = adminModel.findOne({ email: email });
        // const employer = employerModel.findOne({ email: email });
      if (!user) {
        res.status(400).json({ message: "Email already exists" });
      } else {
        const token = jwt.sign({ email: email }, process.env.SECRET_KEY, {
          expiresIn: "1h",
        });
        const link = `http://127.0.0.1:4000/verifyEmail/${token}`;
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
            console.log(err);
          } else {
            console.log(info);
            res.status(200).json({ message: "Email sent successfully" });
          }
        });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
    static async verifyToken(req, res, next) {
        try {
            if (req.param.id) {
                jwt.verify(req.params.id, process.env.SECRET_KEY, (err, decoded) => {
                    if (err) {
                        res.status(401).json({ message: "Invalid token" });
                    } else {
                        next();
                    }
                });
            }
        } catch (error) {
        res.status(500).json({ message: error.message });
        }
    }
}
module.exports = AccountVerification;