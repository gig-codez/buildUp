const freelancerModel = require("../models/freelancer.model");
const bcrypt = require("bcrypt");
class FreelancerController {
  static async index(req, res) {
    try {
      const freelancerPayload = await freelancerModel.find();
      res.status(200).json({ data: freelancerPayload });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
  static async store(req, res) {
    try {
      // first check for occurrence of the account
      const oldAccount = await freelancerModel.findOne({
        email: req.body.email,
      });
      if (oldAccount) {
        res.status(400).json({ message: "Account already exists" });
      } else {
        let hashedPassword = bcrypt.hashSync(req.body.password, 10);
        const freelancerPayload = new freelancerModel({
          first_name: req.body.first_name,
          last_name: req.body.last_name,
          NIN_NUM: req.body.NIN_NUM,
          email: req.body.email,
          country: req.body.country,
          password: hashedPassword,
          gender: req.body.gender,
          address: req.body.address,
          tel_num: req.body.tel_num,
<<<<<<< HEAD
          role: req.body.role,
=======
>>>>>>> 3117a1b (added email otp verification)
        });
        const newfreelancer = await freelancerPayload.save();
        res
          .status(200)
          .json({ message: "Account created", data: newfreelancer });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  static async update(req, res) {
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
                NIN_NUM: req.body.NIN_NUM,
                email: req.body.email,
                country: req.body.country,
                password: hashedPassword,
                gender: req.body.gender,
                address: req.body.address,
                gender: req.body.gender,
                tel_num: req.body.tel_num,
<<<<<<< HEAD
                role: req.body.role,
=======
>>>>>>> 3117a1b (added email otp verification)
              },
              {
                new: true,
              }
            );
            const updatedFreelancer = await freelancer.save();
            res.status(200).json({
              message: "freelancer updated successfully",
              data: updatedFreelancer,
            });
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
        res
          .status(200)
          .json({ message: "single freelancer", data: freelancer });
      } else {
        res.status(400).json({ message: "Freelancer not found" });
      }
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
}
module.exports = FreelancerController;
