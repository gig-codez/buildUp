const employerModel = require("../models/Employer.model");
const bcrypt = require("bcrypt");
class EmployerController {
  static async getAll(req, res) {
    try {
      let employers = employerModel.find({});
      res.status(200).json({ data: employers });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  static async store(req, res) {
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
            });
            const newEmployee = await employerPayload.save();
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
}
module.exports = EmployerController;
