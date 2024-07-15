const shortlistedModel = require("../models/shortlisted.model");
const mailSender = require("../utils/mailSender");
class MailController {
  // send mail
  static async send_mail(req, res) {
    try {
      const feedback = await mailSender(req.body.to, req.body.subject, req.body.body);
      if (feedback) {
        // add contractor to shortlist
        new shortlistedModel({
          contractorId: req.body.receiver,
          employerId: req.body.sender,
        }).save();
        res.status(200).json({ message: "Mail sent successfully" + feedback.response });
      } else {
        res.status(500).json({ message: "Mail not sent" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  // send proposal
  static async send_proposal(req, res) {
    try {
      const feedback = await mailSender(req.body.to, req.body.subject, req.body.body);
      if (feedback) {
        res.status(200).json({ message: "Proposal sent successfully" + feedback.response });
      } else {
        res.status(500).json({ message: "Proposal not sent" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = MailController;
