const employerModel = require("../models/Employer.model");
const bcrypt = require("bcrypt");
const EmployerLogin = require("../Auth/employerlogin");
class EmployerController {
  static async getAll(req, res) {
    try {
      const employers = await employerModel.find().sort({ createdAt: -1 });
      if (!employers) {
        return res.status(404).json({ message: "No employers found" });
      }

      return res.status(200).json({ employers });
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
            const newEmployee = await employerPayload.save();
            req.body.email = req.body.email_address;
            const auth = await EmployerLogin.loginHelper(req);
            res.status(200).json({
              message: "Employer created successfully",
              data: newEmployee,
              auth,
            });
          }
        });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  static async store(req, res) {
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
      res.status(500).json({ message: error.message });
    }
  }
}
module.exports = EmployerController;
