const nodemailer = require("nodemailer");
require("dotenv").config();
const mailSender = async (email, title, body) => {
  try {
    // Create a Transporter to send emails ofourse using nodemailer
    let transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: 465,
      secure: true,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
      // Add DKIM configuration
      // dkim: {
      //   domainName: "buildupuganda.com",
      //   keySelector: "default",
      //   privateKey: process.env.DKIM_PRIVATE_KEY, // Store the private key in your .env file
      //   headerFieldNames: "from:to:subject:date",
      //   skipFields: "list-unsubscribe:precedence"
      // }
    });
    // Send emails to users
    let info = transporter.sendMail({
      from: {
        name: "BuildUp Uganda",
        address: process.env.MAIL_USER // Use authenticated sender address
      },
      to: `${email}`,
      subject: `${title}`,
      html: `${body}`,
      headers: {
        'List-Unsubscribe': `<mailto:${process.env.MAIL_USER}?subject=unsubscribe>`,
        'Precedence': 'bulk'
      },
      // Add SPF and DMARC compliance
      envelope: {
        from: process.env.MAIL_USER,
        to: email
      }
    });
    return info;
  } catch (error) {
    throw new Error(error);
  }
};
module.exports = mailSender;
