const { Resend } = require("resend");
require("dotenv").config();

const resend = new Resend(process.env.RESEND_API_KEY);

const mailSender = async (email, title, body) => {
  console.log("Sending mail to:", email, " by:", process.env.MAIL_FROM, " with token :", process.env.RESEND_API_KEY);
  try {
    const { data, error } = await resend.emails.send({
      from: `BuildUp Uganda <${process.env.MAIL_FROM}>`,
      to: email,
      subject: title,
      html: body,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.log("Mail sending error:", error);
    throw new Error(error);
  }
};

module.exports = mailSender;
