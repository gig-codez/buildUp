const jobsModel = require("../models/jobContract.model");
const employerModel = require("../models/Employer.model");

class JobsController {
  static async addJobs(req, res) {
    try {
      if (!req.body.title || !req.body.description || !req.body.employer) {
        return res.status(400).json({
          success: false,
          message: "Title, description, and employer are required fields.",
        });
      }
      if (!req.body.employer) {
        req.body.employer = req.employerId;
      }

      const newJob = new jobsModel(req.body);
      console.log(newJob);
      // Save the new job
      const savedJob = await newJob.save();
      // Update the employer with the new job reference
      await employerModel.findByIdAndUpdate(req.body.employer, {
        $push: { business: savedJob._id },
      });
      // Send a success response
      res.status(200).json({
        success: true,
        message: "Job created",
        data: savedJob,
      });
    } catch (error) {
      // Send an error response with a meaningful message
      console.error(error);
      res.status(500).json({
        success: false,
        message: "An error occurred while creating the job.",
        error: error.message,
      });
    }
  }

  static async update(req, res) {}
}

module.exports = JobsController;
