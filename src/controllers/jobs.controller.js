const jobsModel = require("../models/jobPost.model");
const appliedJobs = require("../models/applied_jobs.model");
const date = require("../global");

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
      // ADDING PAGINATION FUNCTIONALITY
      const page = parseInt(req.query.page) || 1; // Default to page 1 if page query param is not provided
      const pageSize = parseInt(req.query.pageSize) || 10; // Default page size to 10 if pageSize query param is not provided

      const totalDocuments = await jobsModel.find().countDocuments();
      const totalPages = Math.ceil(totalDocuments / pageSize);

      // Calculate the number of documents to skip
      const skipDocuments = (page - 1) * pageSize;
      const jobs = await jobsModel.find().skip(skipDocuments).limit(pageSize);
      res.status(200).json({
        totalDocuments,

        totalPages,
        currentPage: page,
        pageSize,
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
       // ADDING PAGINATION FUNCTIONALITY
       const page = parseInt(req.query.page) || 1; // Default to page 1 if page query param is not provided
       const pageSize = parseInt(req.query.pageSize) || 10; // Default page size to 10 if pageSize query param is not provided
 
       const totalDocuments = await jobsModel.find({ employer: req.params.employerId }).countDocuments();
       const totalPages = Math.ceil(totalDocuments / pageSize);
 
       // Calculate the number of documents to skip
       const skipDocuments = (page - 1) * pageSize;
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
        .skip(skipDocuments)
        .limit(pageSize)
        .populate("profession", "name");

      res.status(200).json({
        totalDocuments,
        totalPages,
        currentPage: page,
        pageSize,
        jobs,
      });
    } catch (error) {
      res.status(500).json({
       
        message: "An error occured while getting the jobs",
        error: error.message,
      });
    }
  }
  static async contractor_applied_jobs(req, res) {
    try {
      const id = req.params.contractor_id;
      const jobs = await appliedJobs
        .find({ contractorId: id })
        .populate("clientId")
        .populate("contractorId")
        .populate("jobId")
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
      // ADDING PAGINATION FUNCTIONALITY
      const page = parseInt(req.query.page) || 1; // Default to page 1 if page query param is not provided
      const pageSize = parseInt(req.query.pageSize) || 10; // Default page size to 10 if pageSize query param is not provided

      const totalDocuments = await appliedJobs
        .find({ clientId: id })
        .countDocuments();
      const totalPages = Math.ceil(totalDocuments / pageSize);

      // Calculate the number of documents to skip
      const skipDocuments = (page - 1) * pageSize;

      const jobs = await appliedJobs
        .find({ clientId: id })
        .populate("clientId")
        .populate("contractorId")
        .populate("jobId")
        .skip(skipDocuments)
        .limit(pageSize)
        .sort({ createdAt: -1 });
      if (jobs) {
        res.status(200).json({
          totalDocuments,
          // schools,
          totalPages,
          currentPage: page,
          pageSize,
          jobs,
        });
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
        clientId: req.body.client,
        contractorId: req.body.contractor,
        jobId: req.body.job,
        document: `https://buildup-resources.s3.amazonaws.com/docs/${date}-${req.file.originalname}`,
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
  // delete jobs by prof
  static async delete_prof_jobs(req, res) {
    try {
      const jobs = await jobsModel.findByIdAndDelete(req.params.id);

      if (jobs) {
        res.status(200).json({ message: "Job deleted successfully" });
      } else {
        res.status(400).json({ message: "Failed to delete a job." });
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
