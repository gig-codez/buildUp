const freelancerModel = require("../models/freelancer.model");
// const otpModel = require("../models/otp.model");
const bcrypt = require("bcrypt");
const FreelancerLogin = require("../Auth/freelancerLogin");
const fileStorageMiddleware = require("../helpers/file_helper");
const date = require("../global");
class FreelancerController {
  static async index(req, res) {
    try {
      const freelancerPayload = await freelancerModel.find().sort({ _id: -1 });
      res.status(200).json({data: freelancerPayload});
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
        return res.status(400).json({ message: "Account already exists" });
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
          role: req.body.role,
          profession: req.body.profession,
        });
        const newfreelancer = await freelancerPayload.save();
        const auth = await FreelancerLogin.loginHelper(req);

        return res
          .status(200)
          .json({ message: "Account created", data: newfreelancer, auth });
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
                $set: {
                  first_name:
                    req.body.first_name == ""
                      ? freelancerPayload.first_name
                      : req.body.first_name,
                  last_name:
                    req.body.last_name == ""
                      ? freelancerPayload.last_name
                      : req.body.last_name,
                  NIN_NUM:
                    req.body.NIN_NUM == ""
                      ? freelancerPayload.NIN_NUM
                      : req.body.NIN_NUM,
                  email:
                    req.body.email == ""
                      ? freelancerPayload.email
                      : req.body.email,
                  country:
                    req.body.country == ""
                      ? freelancerPayload.country
                      : req.body.country,
                  password:
                    req.body.password == ""
                      ? freelancerPayload.password
                      : hashedPassword,
                  gender:
                    req.body.gender == ""
                      ? freelancerPayload.gender
                      : req.body.gender,
                  address:
                    req.body.address == ""
                      ? freelancerPayload.address
                      : req.body.address,
                  tel_num:
                    req.body.tel_num == ""
                      ? freelancerPayload.tel_num
                      : req.body.tel_num,
                  role: freelancerPayload.role,
                },
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

  static async update_contractor_profile(req, res) {
    let imageUrl = "";
    try {
      if (req.file) {
        // Upload the image to Firebase Storage
        //   let x = req.file.originalname.split('.')
        //  console.log(x[x.length-1])
        imageUrl = await fileStorageMiddleware(req, "photos");
      }

      const freelancerPayload = await freelancerModel.findById(req.params.id);
      if (freelancerPayload) {
        const freelancer = await freelancerModel.findByIdAndUpdate(
          req.params.id,
          {
            $set: {
              profile_pic: imageUrl || freelancerPayload.profile_pic,
            },
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
  static async show(req, res) {
    try {
      const freelancer = await freelancerModel.findById(req.params.id);
      if (freelancer) {
        res.status(200).json(freelancer);
      } else {
        res.status(400).json({ message: "Contractor not found" });
      }
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
}
module.exports = FreelancerController;
