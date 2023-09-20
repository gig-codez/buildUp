const freelancerModel = require("../models/freelancer.model");
const bcrypt = require("bcrypt");
class FreelancerController {
  static async index(req, res, next) {
    try {
      const freelancerPayload = await freelancerModel.find();
      res.status(200).json({ data: freelancerPayload });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
  static async store(req, res, next) {
    try {
      // first check for occurrence of the account
      const oldAccount = freelancerModel.findOne({ email: req.body.email });
      if (oldAccount) {
        res.status(400).json({ message: "Account already exists" });
      } else {
        let hashedPassword = bcrypt.hashSync(req.body.password, 10);
        const freelancerPayload = new freelancerModel({
          username: req.body.username,
          first_name: req.body.first_name,
          last_name: req.body.last_name,
          email: req.body.email,
          password: hashedPassword,
          gender: req.body.gender,
          dob: req.body.dob,
          tel_no: req.body.tel_no,
        });
        await freelancerPayload.save();
        res.status(200).json({ message: "Account created" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  static async update(req, res, next) {
    try {
      const freelancerPayload = await freelancerModel.findById(req.params.id);
      if (freelancerPayload) {
        bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
          if (err) {
            res.status(500).json({ message: err });
          } else {
            const freelancer = await freelancerModel.findByIdAndUpdate(
              req.params.id,
              {
                username: req.body.username,
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                email: req.body.email,
                password: hashedPassword,
                gender: req.body.gender,
                dob: req.body.dob,
                tel_no: req.body.tel_no,
              },
              {
                new: true,
              }
            );
            await freelancer.save();
            res.status(200).json({ freelancer });
          }
        });
      } else {
        res.status(400).json({ message: "Freelancer not found" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
    static async delete(req, res, next) {
      try {
        const freelancer = await freelancerModel.findByIdAndDelete(req.params.id);
        if (freelancer) {
          res.status(200).json({ message: "Freelancer deleted successfully" });
        } else {
          res.status(400).json({ message: "Freelancer not found" });
        }
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
  }
    static async show(req, res, next) {
      try {
        const freelancer = await freelancerModel.findById(req.params.id);
        if (freelancer) {
          res.status(200).json({ freelancer });
        } else {
          res.status(400).json({ message: "Freelancer not found" });
        }
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
  }
}
module.exports = FreelancerController;
