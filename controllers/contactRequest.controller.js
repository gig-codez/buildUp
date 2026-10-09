const ContactRequest = require("../models/contactRequest.model");

class ContactRequestController {
  // POST /admin/contact-request  — client submits request
  static async create(req, res) {
    try {
      const { senderId, senderRole, senderName, recipientId, recipientRole, recipientName, subject, message, jobId } = req.body;
      if (!senderId || !recipientId || !message) {
        return res.status(400).json({ message: "senderId, recipientId and message are required" });
      }
      const request = await ContactRequest.create({
        senderId, senderRole, senderName,
        recipientId, recipientRole, recipientName,
        subject, message, jobId: jobId || null,
      });
      return res.status(201).json({ message: "Contact request submitted", data: request });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // GET /admin/contact-requests  — admin lists all, optional ?status= filter
  static async getAll(req, res) {
    try {
      const filter = {};
      if (req.query.status) filter.status = req.query.status;
      const requests = await ContactRequest.find(filter).sort({ createdAt: -1 });
      return res.status(200).json({ data: requests });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // PATCH /admin/contact-requests/:id/status  — admin connects or rejects
  static async updateStatus(req, res) {
    try {
      const { status, adminNote } = req.body;
      if (!["connected", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Status must be 'connected' or 'rejected'" });
      }
      const request = await ContactRequest.findByIdAndUpdate(
        req.params.id,
        { status, adminNote: adminNote || "" },
        { new: true }
      );
      if (!request) return res.status(404).json({ message: "Request not found" });
      return res.status(200).json({ message: "Status updated", data: request });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
}

module.exports = ContactRequestController;
