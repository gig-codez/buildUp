const contractorProfessionSchema = require("../models/contractorProfession.model");
class ContractorProfessionController {
  // creating contractorProfessions
  static async store(req, res, next) {
    //  first check if profession exists
    let contractorProfessionData = await contractorProfessionSchema.findOne({
      name: req.body.name,
    });
    if (contractorProfessionData) {
      return res.status(400).json({message:"Profession already exists"});
    } else {
      const contractorProfessionPayload = new contractorProfessionSchema({
        name: req.body.name,
        roleId: req.body.role,
      });

      await contractorProfessionPayload.save();
      res.status(200).json({ message: "Profession created" });
    }
  }
  static async findProfById(req, res) {
    try {
      const contractorProfessionPayload = await contractorProfessionSchema.find(
        { roleId: req.params.id }
      );
      res.status(200).json(contractorProfessionPayload);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
  static async index(req, res) {
    try {
      const contractorProfessionPayload =
        await contractorProfessionSchema.find();
      res.status(200).json(contractorProfessionPayload);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
  static async update(req, res, next) {
    try {
      const contractorProfessionPayload =
        await contractorProfessionSchema.findById(req.params.id);
      if (contractorProfessionPayload) {
        const contractorProfession =
          await contractorProfessionSchema.findByIdAndUpdate(
            req.params.id,
            {
              name: req.body.name,
              description: req.body.description,
            },
            {
              new: true,
            }
          );
        await contractorProfession.save();
        res.status(200).json({ contractorProfession });
      } else {
        res.status(400).json({ message: "Profession not found" });
      }
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
  static async delete(req, res, next) {
    try {
      const contractorProfession =
        await contractorProfessionSchema.findByIdAndDelete(req.params.id);
      if (contractorProfession) {
        res.status(200).json({ message: "Profession deleted successfully" });
      } else {
        res.status(400).json({ message: "Profession not found" });
      }
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
}

module.exports = ContractorProfessionController;
