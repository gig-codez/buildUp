const supplierTypeSchema = require("../models/supplierType.model");
class SupplierTypeController {
  // creating supplierTypes
  static async store(req, res, next) {
    //  first check if profession exists
    let supplierTypeData = await supplierTypeSchema.findOne({ name: req.body.name });
    if (supplierTypeData) {
      return res.status(400).send("Supplier Type already exists");
    } else {
      const supplierTypePayload = new supplierTypeSchema({
        name: req.body.name,
        description: req.body.description,
      });

      await supplierTypePayload.save();
      res.status(200).send("Supplier Type created");
    }
  }
  static async index(req, res, next) {
    try {
      const supplierTypePayload = await supplierTypeSchema.find();
      res.status(200).json(supplierTypePayload);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
  static async update(req, res, next) {
    try {
      const supplierTypePayload = await supplierTypeSchema.findById(req.params.id);
      if (supplierTypePayload) {
        const supplierType = await supplierTypeSchema.findByIdAndUpdate(
            req.params.id,
            {
              name: req.body.name,
              description: req.body.description
            },
            {
              new: true,
            }
        );
        await supplierType.save();
        res.status(200).json({ supplierType });
      } else {
        res.status(400).json({ message: "Supplier Type not found" });
      }
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
  static async delete(req, res, next) {
    try {
      const supplierType = await supplierTypeSchema.findByIdAndDelete(req.params.id);
      if (supplierType) {
        res.status(200).json({ message: "Supplier Type deleted successfully" });
      } else {
        res.status(400).json({ message: "Supplier Type not found" });
      }
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
}

module.exports = SupplierTypeController;
