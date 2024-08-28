const nodemailer = require("nodemailer");
require("dotenv").config();
const mailSender = async (email, title, body) => {
  try {
    // Create a Transporter to send emails ofourse using nodemailer
    let transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: 465,
      secure: true, // use TLS
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      tls: {
        // do not fail on invalid certs
        rejectUnauthorized: false,
      },
    });
    // Send emails to users
    let info = await transporter.sendMail({
      from: '"BuildUp Uganda" <mailtrap@buildupuganda.com>',
      to: `${email}`,
      subject: `${title}`,
      html: `${body}`,
    });
    return info;
  } catch (error) {
    throw new Error(error);
  }
};
module.exports = mailSender;
