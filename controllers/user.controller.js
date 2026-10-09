const freelancerModel = require("../models/freelancer.model");
const employerModel = require("../models/employer.model");
const supplierModel = require("../models/supplier.model");
const userModel = require("../models/user.model");
const fileStorageMiddleware = require("../helpers/file_helper");

class UserController {
  static async get_users(req, res) {
    try {
      const suppliers = await supplierModel.find();
      const unifiedSuppliers = await userModel
        .find({ $or: [{ roles: "supplier" }, { activeRole: "supplier" }, { supplierProfile: { $ne: null } }] })
        .lean();
      const contractorsAndConsultants = await freelancerModel
        .find()
        .select("first_name last_name");
      const unifiedMapped = unifiedSuppliers.map((u) => ({
        _id: u._id,
        business_name: u.supplierProfile?.business_name || `${u.first_name} ${u.last_name}`.trim(),
        business_email_address: u.email,
        business_tel: u.tel_num,
        profile_pic: u.profile_pic,
        active: u.active,
        emailVerified: u.emailVerified,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }));
      res.status(200).json([suppliers, unifiedMapped, contractorsAndConsultants].flat());
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }

  static async getUserDetailsByIds(ids) {
    if (!ids || ids.length === 0) return { contractor: [], client: [], supplier: [] };
    const contractorIds = ids.filter((id) => id.startsWith("F")).map((id) => id.replace("F", ""));
    const clientIds = ids.filter((id) => id.startsWith("E")).map((id) => id.replace("E", ""));
    const supplierIds = ids.filter((id) => id.startsWith("S")).map((id) => id.replace("S", ""));

    let contractors = [];
    let clients = [];
    let suppliers = [];

    if (contractorIds.length > 0)
      contractors = await freelancerModel.find({ _id: { $in: contractorIds } });
    if (clientIds.length > 0)
      clients = await employerModel.find({ _id: { $in: clientIds } });
    if (supplierIds.length > 0) {
      const legacy = await supplierModel.find({ _id: { $in: supplierIds } });
      const unified = await userModel
        .find({ _id: { $in: supplierIds }, $or: [{ roles: "supplier" }, { activeRole: "supplier" }, { supplierProfile: { $ne: null } }] })
        .lean();
      const unifiedMapped = unified.map((u) => ({
        _id: u._id,
        business_name: u.supplierProfile?.business_name || `${u.first_name} ${u.last_name}`.trim(),
        business_email_address: u.email,
        business_tel: u.tel_num,
        profile_pic: u.profile_pic,
        supplier_type: u.supplierProfile?.supplier_type,
      }));
      suppliers = [...legacy, ...unifiedMapped];
    }

    return { contractor: contractors, client: clients, supplier: suppliers };
  }

  static searchUserByEmail(data) {
    if (!(data.hasOwnProperty("role") && data.hasOwnProperty("email"))) {
      let error = new Error("Bad request. role and email are required!");
      error.code = 400;
      throw error;
    }
    const role = data.role;
    const emailSearchKey = new RegExp("^" + data.email, "i");
    const userModel =
      role === "contractor"
        ? { model: freelancerModel, searchKey: { email: emailSearchKey } }
        : role === "client"
        ? { model: employerModel, searchKey: { email_address: emailSearchKey } }
        : {
            model: supplierModel,
            searchKey: { business_email_address: emailSearchKey },
          };

    return userModel.model.find(userModel.searchKey);
  }

  static async update_profile_picture(req, res) {
    let imageUrl = "";
    try {
      const { id } = req.params;
      const user = await userModel.findById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (req.file) {
        imageUrl = await fileStorageMiddleware(req, "photos");
      }
      user.profile_pic = imageUrl || user.profile_pic;
      await user.save();
      return res.status(200).json({
        message: "Profile picture updated successfully",
        data: { profile_pic: user.profile_pic },
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}

module.exports = UserController;
