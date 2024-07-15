const roleSchema = require("../models/roles.model");
class RoleController {
  static async index(req, res) {
    try {
      const rolePayload = await roleSchema.find();
      res.status(200).json(rolePayload);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  static async store(req, res) {
    try {
      const { name } = req.body;
      let role = await roleSchema.findOne({ name: name });
      if (role) {
        res.status(400).json({ message: `${name} already exists` });
      } else {
        const rolePayload = new roleSchema({
          name: name,
        });
        await rolePayload.save();
        res.status(200).json({ message: "Role created" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  // delete role
  static async delete(req, res) {
    try {
      const rolePayload = await roleSchema.findById(req.params.id);
      if (rolePayload) {
        await roleSchema.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Role deleted" });
      } else {
        res.status(404).json({ message: "Role not found" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}
module.exports = RoleController;

