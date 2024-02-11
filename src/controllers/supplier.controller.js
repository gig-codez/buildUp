const SupplierModel = require("../models/Supplier.model");
const supplierModel = require("../models/Supplier.model");
const bcrypt = require("bcrypt");
// const otpModel = require("../models/otp.model");
const SupplierLogin = require("../Auth/supplierlogin");
const supplierDealModel = require("../models/supplierDeal.model");
const supplierStockModel = require("../models/supplier_stock.model");
const fileStoreMiddleware = require("../helpers/file_helper");
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
        return res.status(400).json({ message: "Supplier already exists" });
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
            req.body.email = req.body.business_email_address;
            const auth = await SupplierLogin.loginHelper(req);
            res.status(200).json({
              message: "Supplier created successfully",
              data: newSupplier,
              auth,
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
      console.log(updatedData);
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

  static async update_deals(req, res) {
    try {
      const updatedData = req.body.deals;
      const updatedDeals = await supplierModel.findByIdAndUpdate(
        req.params.id,
        { $set: { supplier_deals: updatedData.split(",") } },
        { new: true }
      );

      if (!updatedDeals) {
        return res.status(404).json({ message: "Deals not found" });
      }

      res.status(200).json({
        message: "Deals updated successfully",
        data: updatedDeals,
      });
    } catch (error) {
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
      const singleSupplier = await SupplierModel.findOne({ _id: supplierId });

      if (!singleSupplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      return res.status(200).json(singleSupplier);
    } catch (error) {
      // console.error(error);
      return res.status(500).json({ message: error.message });
    }
  }

  static async create_deals(req, res) {
    try {
      const deals = new supplierDealModel(req.body);
      await deals.save();
      if (deals) {
        res
          .status(200)
          .json({ message: "deals created successfully", data: deals });
      } else {
        res.status(400).json({ message: "deals not created" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  static async deals(req, res) {
    try {
      const deals = await supplierDealModel.find().sort({ createdAt: -1 });
      if (deals) {
        res.status(200).json(deals);
      } else {
        res.status(400).json({ message: "Error fetching deals.." });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  static async deals_by_category(req, res) {
    try {
      const deals = await supplierDealModel
        .find({ supplierType: req.params.id })
        .sort({ createdAt: -1 });
      if (deals) {
        res.status(200).json(deals);
      } else {
        res.status(400).json({ message: "Error fetching deals.." });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  static async delete_deals(req, res) {
    try {
      const deletedDeals = await supplierDealModel.findByIdAndDelete(
        req.params.id
      );
      if (deletedDeals) {
        res.status(200).json({ message: "Deals deleted successfully" });
      } else {
        res.status(400).json({ message: "deals not found" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // create stock
  static async create_stock(req, res) {
    try {
      // console.log(req.body)
      if (req.file) {
        const imagePath = await fileStoreMiddleware(
          req,
          `${req.body.supplier}_stock`
        );
        req.body.product_image = imagePath;
      }
      const stock = new supplierStockModel({
        supplier_id: req.body.supplier,
        product_name: req.body.product_name,
        product_quantity: req.body.product_quantity,
        status: req.body.status,
        product_image: req.body.product_image,
      });
      await stock.save();
      if (stock) {
        res.status(200).json({ message: "stock created successfully" });
      } else {
        res.status(400).json({ message: "stock not created" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async stock(req, res) {
    try {
      // ADDING PAGINATION FUNCTIONALITY
      const page = parseInt(req.query.page) || 1; // Default to page 1 if page query param is not provided
      const pageSize = parseInt(req.query.pageSize) || 10; // Default page size to 10 if pageSize query param is not provided

      const totalDocuments = await supplierStockModel
        .find({ employer: req.params.employerId })
        .countDocuments();
      const totalPages = Math.ceil(totalDocuments / pageSize);

      // Calculate the number of documents to skip
      const skipDocuments = (page - 1) * pageSize;
      const stock = await supplierStockModel
        .find({ supplier_id: req.params.id })
        .sort({ _id: -1 })
        .skip(skipDocuments)
        .limit(pageSize);
      if (stock) {
        res.status(200).json({
          totalDocuments,
          totalPages,
          currentPage: page,
          pageSize,
          stock,
        });
      } else {
        res.status(400).json({ message: "Error fetching stock.." });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async delete_stock(req, res) {
    try {
      const deletedStock = await supplierStockModel.findByIdAndDelete(
        req.params.id
      );
      if (deletedStock) {
        res.status(200).json({ message: "stock deleted successfully" });
      } else {
        res.status(400).json({ message: "stock not found" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async update_stock(req, res) {
    try {
      if (req.file) {
        const imagePath = await fileStoreMiddleware(
          req,
          `${req.body.supplier}_stock`
        );
        req.body.product_image = imagePath;
      } else {
        const oldStock = await supplierStockModel.findOne({
          _id: req.params.id,
        });
        req.body.product_image = oldStock.product_image;
      }
      const stock = await supplierStockModel.findByIdAndUpdate(
        req.params.id,
        req.body
      );
      if (stock) {
        res.status(200).json({ message: "stock updated successfully" });
      } else {
        res.status(400).json({ message: "stock not updated" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}
module.exports = SupplierController;
