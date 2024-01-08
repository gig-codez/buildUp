const SupplierModel = require("../models/Supplier.model");
const supplierModel = require("../models/Supplier.model");
const bcrypt = require("bcrypt");
// const otpModel = require("../models/otp.model");
const SupplierLogin = require("../Auth/supplierlogin");
class SupplierController {
  static async getAll(req, res) {
    try {
      let Supplier = await SupplierModel.find();
      res.status(200).json({ data: Supplier });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async store(req, res) {
    try {
      const supplierData = await supplierModel.findOne({
        business_email_address: req.body.business_email_address,
      });
      if (supplierData) {
        return res.status(400).json({ message: "Supplier already exists"});
      } else {
        bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
          if (err) {
            res.status(500).json({ message: err });
          } else {
            const supplierPayload = new SupplierModel({
              business_name: req.body.business_name,
              business_email_address: req.body.business_email_address,
              password: hashedPassword,
              TIN: req.body.TIN,
              business_tel: req.body.business_tel,
              supplier_type: req.body.supplier_type,
              role: req.body.role,
            });
            const newSupplier = await supplierPayload.save();
            req.body.email = req.body.email_address;
            const auth = await SupplierLogin.loginHelper(req);
            res.status(200).json({
              message: "Supplier created successfully",
              data: newSupplier,
              auth
            });
          }
        });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  static async update(req, res) {
    try {
      const supplierId = req.params.id;
      const updatedData = req.body;

      const updatedSupplier = await SupplierModel.findByIdAndUpdate(
        supplierId,
        updatedData,
        { new: true }
      );

      if (!updatedSupplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      res.status(200).json({
        message: "Supplier updated successfully",
        data: updatedSupplier,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }
  static async delete(req, res) {
    try {
      const supplierId = req.params.id;
      const deletedSupplier = await SupplierModel.findByIdAndDelete(supplierId);

      if (!deletedSupplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      res.status(200).json({ message: "Supplier deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }
  static async show(req, res) {
    try {
      const supplierId = req.params.id;
      const singleSupplier = await SupplierModel.findById(supplierId);

      if (!singleSupplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      res.status(200).json({ data: singleSupplier });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }
}
module.exports = SupplierController;
