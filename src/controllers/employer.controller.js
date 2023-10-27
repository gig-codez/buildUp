const employerModel = require("../models/Employer.model");
const bcrypt = require("bcrypt");

class EmployerController {
  static async getAllEmployers(req, res) {
    try {
      const employers = await employerModel.find({});
      if (!employers) {
        return res.status(404).json({ message: "No employers found" });
      }

      return res.status(200).json({ data: employers });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: error.message });
    }
  }
  static async storeEmployer(req, res) {
    console.log(req.body);
    try {
      const employerData = await employerModel.findOne({
        email_address: req.body.email_address,
      });
      if (employerData) {
        return res.status(400).send("Employer already exist");
      } else {
        bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
          if (err) {
            res.status(500).json({ message: err });
          } else {
            const employerPayload = new employerModel({
              first_name: req.body.first_name,
              last_name: req.body.last_name,
              password: hashedPassword,
              email_address: req.body.email_address,
              TIN_NIN: req.body.TIN_NIN,
              country: req.body.country,
              role: req.body.role,
            });
            console.log(req.body);
            const newEmployee = await employerPayload.save();
            console.log(newEmployee);
            res.status(200).json({
              message: "Employer created successfully",
              data: newEmployee,
            });
          }
        });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  static async updateEmployer(req, res) {
    try {
      const employer = await employerModel.findByIdAndUpdate(
        req.params.id,
        {
          first_name: req.body.first_name,
          last_name: req.body.last_name,
          email_address: req.body.email_address,
          TIN_NIN: req.body.TIN_NIN,
          country: req.body.country,
           
        },
        { new: true }
      );
      if (!employer) {
        return res.status(404).json({ message: "Employer not found" });
      }
      // Hash the password
      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      // Update the password
      employer.password = hashedPassword;
      await employer.save();

      return res.status(200).json({
        message: "Employer updated successfully",
        data: employer,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: error.message });
    }
  }
  static async showEmployer(req, res) {
    try {
      const employerId = req.params.id;

      const singleEmployer = await employerModel.findById(employerId);

      if (!singleEmployer) {
        return res.status(404).json({ message: "Employer not found" });
      }

      return res.status(200).json({ data: singleEmployer });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: error.message });
    }
  }
  static async deleteEmployer(req, res) {
    try {
      const employerId = req.params.id;

      const employer = await employerModel.findByIdAndDelete(employerId);

      if (!employer) {
        return res.status(404).json({ message: "Employer not found" });
      }

      return res.status(200).json({ message: "Employer deleted successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: error.message });
    }
  }
}
module.exports = EmployerController;