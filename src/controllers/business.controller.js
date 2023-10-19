const EmployerModel = require("../models/Employer.model");
const businessModel = require("../models/business.model");
class BusinessController {
  static async getAll(req, res) {
    try {
      let business = await businessModel.find({});
      res.status(200).json({ data: business });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  static async store(req, res) {
    if (!req.body.employer) req.body.employer = req.params.id;
   
    try {
      const businessData = await businessModel.findOne({
        business_email: req.body.business_email,
      });

      if (businessData) {
        return res.status(400).send("Business already exists");
      } else {
        const businessPayload = new businessModel(req.body);
        const newBusines = await businessPayload.save();
        res.status(200).json({
          message: "business created successfully",
          data: newBusines,
        });
        await EmployerModel.findByIdAndUpdate(req.body.employer, {
          $push: { business: newBusines._id },
        });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}
module.exports = BusinessController;
