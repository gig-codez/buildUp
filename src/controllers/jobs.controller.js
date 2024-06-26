const jobsModel = require("../models/jobPost.model");
const appliedJobs = require("../models/applied_jobs.model");
const date = require("../global");
const fileStorageMiddleware = require("../helpers/file_helper");
const employerModel = require("../models/employer.model");

class JobsController {
  static async addJobs(req, res) {
    try {
      if (!req.body.employer) {
        req.body.employer = req.params.employerId;
        // add contact and address details from employer model
        const employer = await employerModel.findOne({
          _id: req.body.employer,
        }).populate("business");
        // attach contact
        req.body.contact = employer.business.business_tel;
        req.body.address = employer.business.address;
      }
      if (!req.body.job_title || !req.body.job_description) {
        return res.status(400).json({
          message: "Title, description, and employer are required fields.",
        });
      }

      const newJob = new jobsModel(req.body);
      // Save the new job
      const savedJob = await newJob.save();

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

      const totalDocuments = await jobsModel.find({ is_applied: false }).countDocuments();
      const totalPages = Math.ceil(totalDocuments / pageSize);

      // Calculate the number of documents to skip
      const skipDocuments = (page - 1) * pageSize;
      const jobs = await jobsModel.find({ is_applied: false }).skip(skipDocuments)
        .limit(pageSize);
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
          is_applied: false
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

      const totalDocuments = await jobsModel
        .find({ employer: req.params.employerId })
        .countDocuments();
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
        .populate({
          path: "contractorId",
          populate: {
            path: "profession"
          }
        })
        // .populate("profession")
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
    let docUrl = "";
    if (req.file) {
      docUrl = await fileStorageMiddleware(req, "docs");
    }
    try {
      const jobs = new appliedJobs({
        clientId: req.body.client,
        contractorId: req.body.contractor,
        jobId: req.body.job,
        document: docUrl,
        // `https://buildup-resources.s3.amazonaws.com/buildUp-${req.params.name}/docs/${date}-${req.file.originalname}`,
      });
      await jobs.save();
      if (jobs) {
        // update jobs model
        const job = await jobsModel.findByIdAndUpdate(
          req.body.job,
          { $set: { is_applied: true } },
          { new: true }
        );
        await job.save();
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
        ''
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
