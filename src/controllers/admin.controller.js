const adminSchema = require("../models/admin.model");
const bcrypt = require("bcrypt");
class AdminController {
  static async store(req, res, next) {
    //  first check if admin exists
    let adminData = await adminSchema.findOne({ email: req.body.email });
    if (adminData) {
      return res.status(400).send("Admin already exists");
    } else {
      bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
        if (err) {
          res.status(500).json({ message: err });
        } else {
          const adminPayload = new adminSchema({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
          });

          await adminPayload.save();
          res.status(200).send("Admin created");
        }
      });
    }
  }
  static async index(req, res, next) {
    try {
      const adminPayload = await adminSchema.find();
      res.status(200).json({ adminPayload });
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
        res.status(200).json({ admin });
      } else {
        res.status(400).json({ message: "Admin not found" });
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
}

module.exports = AdminController;
