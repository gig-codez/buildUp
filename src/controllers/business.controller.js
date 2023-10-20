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
  static async updateBusiness(req, res) {
    try {
      const updatedBusiness = await businessModel.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );

      if (!updatedBusiness) {
        return res.status(404).json({ message: "Business not found" });
      }

      res.status(200).json({
        message: "Business updated successfully",
        data: updatedBusiness,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }
  static async getBusinessById(req, res) {
    try {
      const business = await businessModel.findById(req.params.id);

      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      res.status(200).json({ data: business });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }
  static async deleteBusiness(req, res) {
    try {
      const businessId = req.params.id;
      const deletedBusiness = await businessModel.findByIdAndDelete(businessId);

      if (!deletedBusiness) {
        return res.status(404).json({ message: "Business not found" });
      }
      const employerId = deletedBusiness.employer;
      await EmployerModel.findByIdAndUpdate(employerId, {
        $pull: { business: businessId },
      });

      res.status(200).json({ message: "Business deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }
}
module.exports = BusinessController;
