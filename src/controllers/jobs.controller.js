const jobsModel = require("../models/jobPost.model");
const employerModel = require("../models/Employer.model");

class JobsController {
  static async addJobs(req, res) {
    try {
      if (!req.body.employer) {
        req.body.employer = req.params.employerId;
      }
      if (!req.body.job_title || !req.body.job_description) {
        return res.status(400).json({
          success: false,
          message: "Title, description, and employer are required fields.",
        });
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

  static async getalljobs(req, res) {
    try {
      const jobs = await jobsModel.find();
      res.status(200).json({
        success: true,
        data: jobs,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "An error occured while getting the jobs",
        error: error.message,
      });
    }
  }

  static async getJobsByProfession(req, res){
    try {
      const jobs = await jobsModel.find({profession: req.params.professionId});
      res.status(200).json({
        success: true,
        data: jobs,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "An error occured while getting the jobs",
        error: error.message,
      });
    }
  }
  // static async searchByTitle(req, res) {
  //   const searchTerm = req.params.title;
  // }
}

module.exports = JobsController;
