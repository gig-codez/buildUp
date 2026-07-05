const supplierModel = require("../models/supplier.model");
const bcrypt = require("bcrypt");
const SupplierLogin = require("../Auth/supplierlogin");
const dealModel = require("../models/deal.model");
const supplierDealModel = require("../models/supplierDeal.model");
const supplierStockModel = require("../models/supplier_stock.model");
const fileStoreMiddleware = require("../helpers/file_helper");
require("dotenv").config();
const speakeasy = require("speakeasy");
const OtpController = require("./otpController.js");
class SupplierController {
  static async getAll(req, res) {
    try {
      // ADDING PAGINATION FUNCTIONALITY
      const page = parseInt(req.query.page) || 1; // Default to page 1 if page query param is not provided
      const pageSize = parseInt(req.query.pageSize) || 10; // Default page size to 10 if pageSize query param is not provided
      const totalDocuments = await supplierModel
        .find()
        .countDocuments();
      const totalPages = Math.ceil(totalDocuments / pageSize);
      // Calculate the number of documents to skip
      const skipDocuments = (page - 1) * pageSize;
      let Supplier = await supplierModel
        .find()
        .populate("supplier_type", "name");
      res.status(200).json({
        totalDocuments,
        totalPages,
        currentPage: page,
        pageSize, data: Supplier
      });
    } catch (error) {
      res.status(500).json({
        totalDocuments,
        totalPages,
        currentPage: page,
        pageSize, message: error.message
      });
    }
  }

  static async getAllStocks(req, res) {
    try {
      // ADDING PAGINATION FUNCTIONALITY
      const page = parseInt(req.query.page) || 1; // Default to page 1 if page query param is not provided
      const pageSize = parseInt(req.query.pageSize) || 10; // Default page size to 10 if pageSize query param is not provided
      const totalDocuments = await supplierStockModel
        .find()
        .countDocuments();
      const totalPages = Math.ceil(totalDocuments / pageSize);
      // Calculate the number of documents to skip
      const skipDocuments = (page - 1) * pageSize;
      let Supplier = await supplierStockModel
        .find()
        .skip(skipDocuments)
        .limit(pageSize);
        // .populate("supplier_type", "name");
      res.status(200).json({
        totalDocuments,
        totalPages,
        currentPage: page,
        pageSize, data: Supplier
      });
    } catch (error) {
      res.status(500).json({
        totalDocuments,
        totalPages,
        currentPage: page,
        pageSize, message: error.message
      });
    }
  }

  static async store(req, res) {
    try {
      // Generate a new short-code with a 5-minute expiration time
      const short_code = speakeasy.totp({
        secret: 'secret',
        encoding: "base32",
        window: 5, // OTP valid for 5 minutes
      });
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
            const supplierPayload = new supplierModel({
              business_name: req.body.business_name,
              business_email_address: req.body.business_email_address,
              password: hashedPassword,
              TIN: req.body.TIN,
              business_tel: req.body.business_tel,
              supplier_type: req.body.supplier_type,
              role: req.body.role,
              otp: short_code,
            });
            const newSupplier = await supplierPayload.save();
            // req.body.email = req.body.business_email_address;
            // const auth = await SupplierLogin.loginHelper(req);

            // send email verification code
            await OtpController.sendMailVerification({
              email: req.body.business_email_address,
              userId: newSupplier._id,
            })
            // send sms otp
            await OtpController.otpMsg({
              phone: req.body.business_tel,
              name: req.body.business_name,
              code: short_code,
            });
            res.status(200).json({
              message: "Supplier created successfully",
              data: newSupplier,

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
      const updatedSupplier = await supplierModel.findByIdAndUpdate(
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
  // update supplier password
  static async updatePassword(req, res) {
    try {
      const supplierId = req.params.id;
      const updatedData = req.body;
      bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
        if (err) {
          res.status(500).json({ message: err });
        } else {
          updatedData.password = hashedPassword;
          const updatedSupplier = await supplierModel.findByIdAndUpdate(
            supplierId,
            updatedData,
            { new: true }
          );

          if (!updatedSupplier) {
            return res.status(404).json({ message: "Supplier not found" });
          }

          res.status(200).json({
            message: "Supplier password updated successfully",
            data: updatedSupplier,
          });
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }

  static async update_deals(req, res) {
    try {
      const supplierId = req.params.id;
      const deals = req.body.deals.split(",");

      const docs = [];
      deals.forEach((deal) => {
        docs.push({ supplier: supplierId, deal: deal });
      });

      await supplierDealModel.insertMany(docs, { ordered: true });

      res.status(200).json({
        message: "Deals added successfully",
        data: deals,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  static async delete(req, res) {
    try {
      const supplierId = req.params.id;
      const deletedSupplier = await supplierModel.findByIdAndDelete(supplierId);

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
      const singleSupplier = await supplierModel.findById(supplierId).populate("supplier_type", "name");

      if (!singleSupplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      res.status(200).json({ data: singleSupplier });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }

  static async create_deals(req, res) {
    try {
      const deals = new dealModel(req.body);
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
      const deals = await dealModel.find({}).sort({ _id: -1 }).populate("supplier_type", "name");
      if (deals) {
        res.status(200).json({ deals });
      } else {
        res.status(400).json({ message: "Error fetching deals.." });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  static async deals_by_category(req, res) {
    try {
      console.log(req.params.id);
      const deals = await dealModel
        .find({ supplier_type: req.params.id }).populate("supplier_type", "name")
        .sort({ _id: -1 });

      if (deals) {
        res.status(200).json({ deals });
      } else {
        res.status(400).json({ message: "Error fetching deals.." });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  static async delete_deals(req, res) {
    try {
      const deletedDeals = await dealModel.findByIdAndDelete(req.params.id);
      if (deletedDeals) {
        res.status(200).json({ message: "Deals deleted successfully" });
      } else {
        res.status(400).json({ message: "deals not found" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async supplier_deals(req, res) {
    try {
      const supplierDeals = await supplierDealModel.find().sort({ _id: -1 }).populate("supplier_type", "name");
      res.status(200).json({ data: supplierDeals });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async supplier_deals_by_supplierId(req, res) {
    try {
      const deals = await supplierDealModel
        .find({ supplier: req.params.supplierId })
        .sort({ _id: -1 })
        // .populate("supplier_type", "name")
        .populate({
          path: "deal",
        });
      res.status(200).json({ data: deals });
      if (deals) {
        res.status(200).json({ data: deals });
      } else {
        res.status(400).json({ message: "Error fetching deals.." });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async supplier_deals_by_dealId(req, res) {
    try {
      const deals = await supplierDealModel
        .find({ deal: req.params.dealId })
        .sort({ _id: -1 })
        .populate({
          path: "supplier",
        });
      if (deals) {
        res.status(200).json({ data: deals });
      } else {
        res.status(400).json({ message: "Error fetching deals.." });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // create stock
  static async create_stock(req, res) {
    try {
      if (req.file) {
        const imagePath = await fileStoreMiddleware(
          req,
          `${req.body.supplier}_stock`
        );
        req.body.product_image = imagePath;
      }
      // Parse variants if sent as JSON string
      let variants = [];
      if (req.body.variants) {
        try {
          variants = typeof req.body.variants === "string"
            ? JSON.parse(req.body.variants)
            : req.body.variants;
        } catch (_) { variants = []; }
      }
      const stock = new supplierStockModel({
        supplier_id: req.body.supplier,
        product_name: req.body.product_name,
        product_quantity: req.body.product_quantity,
        product_price: req.body.product_price,
        status: req.body.status,
        product_image: req.body.product_image,
        category: req.body.category || "Other",
        description: req.body.description || "",
        unit: req.body.unit || "piece",
        variants,
      });
      await stock.save();
      if (stock) {
        res.status(200).json({ message: `${req.body.product_name} created successfully`, data: stock });
      } else {
        res.status(400).json({ message: `${req.body.product_name} stock not created` });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  }

  static async stock(req, res) {
    try {
      // ADDING PAGINATION FUNCTIONALITY
      const page = parseInt(req.query.page) || 1; // Default to page 1 if page query param is not provided
      const pageSize = parseInt(req.query.pageSize) || 10; // Default page size to 10 if pageSize query param is not provided

      const totalDocuments = await supplierStockModel
        .find({ supplier_id: req.params.id })
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
          data: stock,
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
        const oldStock = await supplierStockModel.findOne({ _id: req.params.id });
        req.body.product_image = oldStock.product_image;
      }
      // Parse variants if sent as JSON string
      if (req.body.variants && typeof req.body.variants === "string") {
        try { req.body.variants = JSON.parse(req.body.variants); }
        catch (_) { delete req.body.variants; }
      }
      const stock = await supplierStockModel.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (stock) {
        res.status(200).json({ message: "stock updated successfully", data: stock });
      } else {
        res.status(400).json({ message: "stock not updated" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // GET /stock/search?q=name&minPrice=&maxPrice=&location=&category=
  static async search_stock(req, res) {
    try {
      const { q, minPrice, maxPrice, location, category } = req.query;
      const stockFilter = {};
      if (q) stockFilter.product_name = { $regex: q, $options: "i" };
      if (category && category !== "All") stockFilter.category = category;
      if (minPrice) stockFilter.product_price = { $gte: Number(minPrice) };
      if (maxPrice) {
        stockFilter.product_price = {
          ...(stockFilter.product_price || {}),
          $lte: Number(maxPrice),
        };
      }

      // If location filter, first find matching supplier IDs
      if (location) {
        const matchingSuppliers = await supplierModel.find({
          $or: [
            { business_address: { $regex: location, $options: "i" } },
            { business_name: { $regex: location, $options: "i" } },
          ],
        }).select("_id");
        stockFilter.supplier_id = { $in: matchingSuppliers.map((s) => s._id) };
      }

      const stock = await supplierStockModel
        .find(stockFilter)
        .populate("supplier_id", "business_name business_address")
        .sort({ createdAt: -1 })
        .limit(100);

      const results = stock.map((s) => ({
        _id: s._id,
        productName: s.product_name,
        productPrice: s.product_price,
        productQuantity: s.product_quantity,
        productImage: s.product_image,
        status: s.status,
        category: s.category || "Other",
        description: s.description || "",
        unit: s.unit || "piece",
        variants: s.variants || [],
        supplierId: s.supplier_id?._id,
        supplierName: s.supplier_id?.business_name || "",
        supplierAddress: s.supplier_id?.business_address || "",
      }));

      return res.status(200).json({ data: results });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // GET /stock/analytics/:supplierId
  static async supplier_analytics(req, res) {
    try {
      const Order = require("../models/order.model");
      const supplierId = req.params.supplierId;

      const [stockItems, orders] = await Promise.all([
        supplierStockModel.find({ supplier_id: supplierId }),
        Order.find({ supplierId }),
      ]);

      const totalProducts = stockItems.length;
      const totalOrders = orders.length;
      const pendingOrders = orders.filter((o) => o.status === "pending").length;
      const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
      const totalEarnings = orders
        .filter((o) => o.status === "delivered")
        .reduce((sum, o) => sum + o.totalAmount, 0);
      const lowStockCount = stockItems.filter((s) => s.product_quantity <= 5).length;

      // Monthly earnings (current calendar month)
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyEarnings = orders
        .filter((o) => o.status === "delivered" && new Date(o.createdAt) >= monthStart)
        .reduce((sum, o) => sum + o.totalAmount, 0);

      // Top products by order count
      const productCount = {};
      const productRevenue = {};
      const productMeta = {};
      for (const order of orders) {
        for (const item of order.items) {
          productCount[item.productId] = (productCount[item.productId] || 0) + item.quantity;
          productRevenue[item.productId] = (productRevenue[item.productId] || 0) + item.unitPrice * item.quantity;
          productMeta[item.productId] = { productName: item.productName, productImage: item.productImage };
        }
      }
      const topProducts = Object.entries(productCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([productId, orderCount]) => ({
          productId,
          productName: productMeta[productId]?.productName || "",
          productImage: productMeta[productId]?.productImage || "",
          orderCount,
          revenue: productRevenue[productId] || 0,
        }));

      return res.status(200).json({
        data: {
          totalProducts, totalOrders, pendingOrders, deliveredOrders,
          totalEarnings, monthlyEarnings, lowStockCount, topProducts,
        },
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}
module.exports = SupplierController;
