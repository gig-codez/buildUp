const employerModel = require("../model/Employer.model");
const jobsModel = require("../model/jobContract.model");

class JobsController {
  static async addjobs(req, res) {
    if (!req.body.employer) req.body.employer = req.employerId;
     const newjob = new jobsModel(rq.body);
     console.log(newjob);
    try {
      const savedjob = await newjob.save();
      await employerModel.findByIdAndUpdate(req.body.employer, {
        $push: { business: savedjob._id },
      });
      res
        .status(201)
        .json({ success: true, message: "job created", data: savedjob });
    } catch (error) {
      console.log(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
