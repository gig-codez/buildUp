const adminSchema = require("../models/admin.model");
const bcrypt = require("bcrypt");
const freelancerModel = require("../models/freelancer.model");
const employerModel = require("../models/employer.model");
const supplierModel = require("../models/supplier.model");
const mailSender = require("../utils/mailSender");
require('dotenv').config();
class AdminController {
  // creating admins
  static async store(req, res, next) {
    //  first check if admin exists
    let adminData = await adminSchema.findOne({ email: req.body.email });
    if (adminData) {
      return res.status(400).json({ message: "Admin already exists" });
    } else {
      bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
        if (err) {
          return res.status(500).json({ message: err });
        } else {
          const adminPayload = new adminSchema({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
          });

          await adminPayload.save();
          if (adminPayload) {
            return res.status(200).json({ message: "Admin created" });
          } else {
            return res.status(400).json({ message: "Admin not created" });
          }
        }
      });
    }
  }
  static async index(req, res, next) {
    try {
      const adminPayload = await adminSchema.find();
      res.status(200).json(adminPayload);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
  static async update(req, res, next) {
    try {
      const adminPayload = await adminSchema.findById(req.params.id);
      if (adminPayload) {
        const admin = await adminSchema.findByIdAndUpdate(
          req.params.id,
          {
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
          },
          {
            new: true,
          }
        );
        await admin.save();
        return res.status(200).json({ message: "Admin updated successfully", data: admin });
      } else {
        return res.status(400).json({ message: "Admin not found" });
      }
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
  static async delete(req, res, next) {
    try {
      const admin = await adminSchema.findByIdAndDelete(req.params.id);
      if (admin) {
        res.status(200).json({ message: "Admin deleted successfully" });
      } else {
        res.status(400).json({ message: "Admin not found" });
      }
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
  // user data info
  static async userData(req, res) {
    try {
      const userPayload = await adminSchema.findOne({
        _id: req.params.id
      }).select('name email');
      res.status(200).json(userPayload);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
  // deactivate user
  static async deactivateUser(req, res) {
    try {
      // first check if user exists
      const user1 = await freelancerModel.findOne({
        _id: req.params.id, active: true
      });
      if (user1) {
        // deactivate the user
        const deactivated = await freelancerModel.findByIdAndUpdate(
          req.params.id,
          {
            $set: {
              active: false,
            }
          },
          {
            new: true
          }
        );
        await deactivated.save();
        mailSender(
          process.env.ADMIN_EMAIL,
          "Account Deactivation",
          `You deactivated ${user1.first_name} ${user1.last_name}'s account`,
        )
        res.status(200).json({ message: "User deactivated" });
      } else {
        const user2 = await employerModel.findOne({ _id: req.params.id, active: true });
        if (user2) {
          // deactivate the user
          const deactivated = await employerModel.findByIdAndUpdate(
            req.params.id,
            {
              $set: {
                active: false,
              }
            },
            {
              new: true
            }
          );
          await deactivated.save();
          mailSender(
            process.env.ADMIN_EMAIL,
            "Account Deactivation",
            `You deactivated ${user2.first_name} ${user2.last_name}'s account`,
          );
          res.status(200).json({ message: "User deactivated" });
        } else {
          // check if supplier exists
          const supplier = await supplierModel.findOne({ _id: req.params.id, active: true });
          if (supplier) {
            // deactivate the user
            const deactivated = await supplierModel.findByIdAndUpdate(
              req.params.id,
              {
                $set: {
                  active: false,
                }
              },
              {
                new: true
              }
            );
            await deactivated.save();
            mailSender(
              process.env.ADMIN_EMAIL,
              "Account Deactivation",
              `You deactivated ${supplier.business_name}'s account`,
            );
            res.status(200).json({ message: "User deactivated" });
          } else {
            return res.status(400).json({ message: "User not found" });
          }
        }
      }

    } catch (err) {
      mailSender(
        process.env.DEV,
        "Deactivation error",
        err.message,
      );
      res.status(500).json({ message: err.message });

    }
  }
  // function to reactivate user
  static async reactivateUser(req, res) {
    try {
      // first check if user exists
      const user1 = await freelancerModel.findOne({
        _id: req.params.id, active: false
      });
      if (user1) {
        // deactivate the user
        const deactivated = await freelancerModel.findByIdAndUpdate(
          req.params.id,
          {
            $set: {
              active: true,
            }
          },
          {
            new: true
          }
        );
        await deactivated.save();
        mailSender(
          process.env.ADMIN_EMAIL,
          "Account Reactivation",
          `You reactivated ${user1.first_name} ${user1.last_name}'s account`,
        )
        res.status(200).json({ message: "User reactivated" });
      } else {
        const user2 = await employerModel.findOne({ _id: req.params.id, active: false });
        if (user2) {
          // deactivate the user
          const deactivated = await employerModel.findByIdAndUpdate(
            req.params.id,
            {
              $set: {
                active: true,
              }
            },
            {
              new: true
            }
          );
          await deactivated.save();
          mailSender(
            process.env.ADMIN_EMAIL,
            "Account Reactivation",
            `You reactivated ${user2.first_name} ${user2.last_name}'s account`,
          );
          res.status(200).json({ message: "User reactivated" });
        } else {
          // check if supplier exists
          const supplier = await supplierModel.findOne({ _id: req.params.id, active: false });
          if (supplier) {
            // deactivate the user
            const deactivated = await supplierModel.findByIdAndUpdate(
              req.params.id,
              {
                $set: {
                  active: true,
                }
              },
              {
                new: true
              }
            );
            await deactivated.save();
            mailSender(
              process.env.ADMIN_EMAIL,
              "Account Reactivation",
              `You reactivated ${supplier.business_name}'s account`,
            );
            res.status(200).json({ message: "User reactivated" });
          } else {
            return res.status(400).json({ message: "User not found" });
          }
        }
      }

    } catch (err) {
      mailSender(
        process.env.DEV,
        "Reactivation error",
        err.message,
      );
      res.status(500).json({ message: err.message });
    }
  }
}

module.exports = AdminController;
