const shortlistedModel = require("../models/shortlisted.model.js");
class ShortListedController {
  // CRUD
  // Create

  // Read
  static async fetch_short_listed_contractors(req, res) {
    try {
      // ADDING PAGINATION FUNCTIONALITY
      const page = parseInt(req.query.page) || 1; // Default to page 1 if page query param is not provided
      const pageSize = parseInt(req.query.pageSize) || 10; // Default page size to 10 if pageSize query param is not provided

      const totalDocuments = await shortlistedModel
        .find({ employerId: req.params.id })
        .countDocuments();
      const totalPages = Math.ceil(totalDocuments / pageSize);

      // Calculate the number of documents to skip
      const skipDocuments = (page - 1) * pageSize;

      const shortlisted = await shortlistedModel
        .find({ employerId: req.params.id })
        .populate("contractorId")
        .skip(skipDocuments)
        .limit(pageSize)
        .sort({ createdAt: -1 });
      if (!shortlisted) {
        return res.status(404).json({ message: "No shortlisted found" });
      } else {
        return res.status(200).json({
          totalDocuments,
          totalPages,
          currentPage: page,
          pageSize,
          shortlisted,
        });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  // Update
  static async update(req, res) {
    try {
      const shortlisted = await shortlistedModel.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!shortlisted) {
        return res.status(404).json({ message: "Shortlisted not found" });
      } else {
        return res.status(200).json({
          message: "Shortlisted updated successfully",
          data: shortlisted,
        });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  // Delete
  static async delete(req, res) {
    try {
      const shortlisted = await shortlistedModel.findByIdAndDelete(
        req.params.id
      );
      if (!shortlisted) {
        return res.status(404).json({ message: "Shortlisted not found" });
      } else {
        return res.status(200).json({
          message: "Shortlisted deleted successfully",
        });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}
module.exports = ShortListedController;
