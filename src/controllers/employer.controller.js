const employerModel = require("../models/employer.model");
const employerSchema = require("../models/employer.model");
const { default: mongoose } = require("mongoose");
const bcrypt = require("bcrypt");
class EmployerController {
  //getting employers
  static async index(req, res, next) {
    try {
      const employerPayload = await employerModel.find();
      res.status(200).json({ employerPayload });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
  //storing new employer
  static async store(req, res, next) {
    console.log(req.body);
    try {
      const employerData = await employerModel.findOne({
        email_address: req.body.email_address,
      });
      if (employerData) {
        return res.status(400).send("Employer already exists");
      } else {
        bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
          if (err) {
            res.status(500).json({ message: err });
          } else {
            const employerPayload = new employerModel({
              first_name: req.body.first_name,
              last_name: req.body.last_name,
              TIN_NIN: req.body.TIN_NIN,
              business_name: req.body.business_name,
              year_of_foundation: req.body.year_of_foundation,
              business_tel: req.body.business_tel,
              address: req.body.address,
              country: req.body.country,
              email_address: req.body.email_address,
              password: hashedPassword,
              user_id: new mongoose.Types.ObjectId(), // Generate a new ObjectId
              employer_id: new mongoose.Types.ObjectId(), // Generate a new ObjectId
            });

            const newEmployer = await employerPayload.save();
            res.status(200).json({
              message: "User created successfully",
              data: newEmployer,
            });
          }
        });
      }
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
}
module.exports = EmployerController;
