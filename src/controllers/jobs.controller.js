const jobsModel = require("../models/jobPost.model");
const appliedJobs = require("../models/applied_jobs.model");

class JobsController {
  static async addJobs(req, res) {
    try {
      if (!req.body.employer) {
        req.body.employer = req.params.employerId;
      }
      if (!req.body.job_title || !req.body.job_description) {
        return res.status(400).json({
          message: "Title, description, and employer are required fields.",
        });
      }

      const newJob = new jobsModel(req.body);
      console.log(newJob);
      // Save the new job
      const savedJob = await newJob.save();
      // // Update the employer with the new job reference
      // await employerModel.findByIdAndUpdate(req.body.employer, {
      //   $push: { business: savedJob._id },
      // });
      // Send a success response
      if (savedJob) {
        res.status(200).json({
          message: "Job added successfully.",
          data: savedJob,
        });
      } else {
        res.status(400).json({
          message: "Error creating job.",
        });
      }
    } catch (error) {
      // Send an error response with a meaningful message
      console.error(error);
      res.status(500).json({
        message: `Error ${error.message}.`,
      });
    }
  }

  static async get_all_jobs(req, res) {
    try {
      const jobs = await jobsModel.find();
      res.status(200).json({
        jobs,
      });
    } catch (error) {
      res.status(500).json({
        message: `Error: ${error.message}`,
      });
    }
  }

  static async getJobsByProfession(req, res) {
    try {
      const jobs = await jobsModel
        .find({
          profession: req.params.professionId,
        })
        .populate({
          path: "employer",
          select: "first_name last_name",
          populate: {
            path: "business",
            select:
              "business_name business_email business_tel address year_of_foundation",
          },
        })
        .populate("profession", "name");
      res.status(200).json(jobs);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "An error occured while getting the jobs",
        error: error.message,
      });
    }
  }

  static async getJobsByEmployer(req, res) {
    try {
      const jobs = await jobsModel
        .find({ employer: req.params.employerId })
        .populate({
          path: "employer",
          select: "first_name last_name",
          populate: {
            path: "business",
            select:
              "business_name business_email business_tel address year_of_foundation",
          },
        })
        .populate("profession", "name");

      res.status(200).json(jobs);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "An error occured while getting the jobs",
        error: error.message,
      });
    }
  }
  static async contractor_applied_jobs(req, res) {
    try {
      const id = req.params.contractor_id;
      const jobs = await appliedJobs
        .find({ contractor: id })
        .sort({ createdAt: -1 });
      if (jobs) {
        res.status(200).json(jobs);
      } else {
        res.status(400).json({ message: "Jobs not found" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  static async client_jobs(req, res) {
    try {
      const id = req.params.client_id;
      const jobs = await appliedJobs
        .find({ client: id })
        .sort({ createdAt: -1 });
      if (jobs) {
        res.status(200).json(jobs);
      } else {
        res.status(400).json({ message: "Jobs not found" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  static async store_applied_jobs(req, res) {
    try {
      const jobs = new appliedJobs({
        client: req.body.client,
        contractor: req.body.contractor,
        job: req.body.job,
        document: `https://buildup-resources.s3.amazonaws.com/docs/${Date.now()}-${
          req.file.originalname
        }`,
      });
      await jobs.save();
      if (jobs) {
        res.status(200).json({ message: "New applied saved successfully" });
      } else {
        res.status(400).json({ message: "Failed to add a new application." });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // delete applied jobs
  static async delete_applied_jobs(req, res) {
    try {
      const jobs = await appliedJobs.findByIdAndDelete(req.params.id);

      if (jobs) {
        res.status(200).json({ message: "Applied job deleted successfully" });
      } else {
        res
          .status(400)
          .json({ message: "Failed to delete a new application." });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = JobsController;
