const employerModel = require("../models/Employer.model");
class EmployerController {
  static async getAll(req, res) {
    try {
      let employers = employerModel.find();
      res.status(200).json({ data: employers });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  static async store(req, res) {
    try {
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async show(req, res){

  }

  static async delete(req, res){

  }

  static async updateEmployer(req, res){

  }
}
module.exports = EmployerController;
