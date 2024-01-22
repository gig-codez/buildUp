const SupplierModel = require("../models/Supplier.model");
const freelancerModel = require("../models/freelancer.model");
const supplierDealModel = require("../models/supplierDeal.model");

class SearchController {
  static async query(req, res) {
    try {
      const { profession, category, minPrice, supplier_type, maxPrice, role } =
        req.query;

      let query = {};
      if (role) {
        query.role = role;
      }
      if (supplier_type) {
        query.supplier_type = supplier_type;
      }
      if (profession) {
        query.profession = profession;
      }

      if (category) {
        query.category = category;
      }

      if (minPrice || maxPrice) {
        query.price = { $gte: minPrice, $lte: maxPrice };
      }
      // logic to search for suppliers
      if (role == "653ba9b2494d3ca622ad4852") {
        const data = await SupplierModel.find(query);
        if (data) {
          return res.status(200).json(data);
        } else {
          return res.status(404).json({ message: "No result found." });
        }
      }
      // logic to search for contractors and consultants
      const freelancer = await freelancerModel.find(query);
      if (freelancer) {
        return res.status(200).json(freelancer);
      } else {
        return res.status(404).json({ message: "No result found." });
      }
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}
module.exports = SearchController;
