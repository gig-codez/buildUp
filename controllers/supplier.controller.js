const supplierModel = require("../models/supplier.model");
const userModel = require("../models/user.model");
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
  // Resolves supplier details for stock rows, supporting both legacy
  // `supplier` documents and unified `user` documents (activeRole/supplierProfile).
  // Returns a map keyed by supplier _id string.
  static async _resolveSuppliers(stockDocs) {
    const ids = [
      ...new Set(
        stockDocs
          .map((s) => s.supplier_id)
          .filter(Boolean)
          .map((id) => (id._id ? id._id.toString() : id.toString()))
      ),
    ];
    if (ids.length === 0) return {};

    const [legacy, unified] = await Promise.all([
      supplierModel.find({ _id: { $in: ids } }).lean(),
      userModel.find({ _id: { $in: ids } }).lean(),
    ]);

    const map = {};
    legacy.forEach((s) => {
      map[s._id.toString()] = {
        _id: s._id,
        business_name: s.business_name || "",
        business_address: s.business_address || "",
        business_email_address: s.business_email_address || "",
        business_tel: s.business_tel || "",
        profile_pic: s.profile_pic || "",
        supplier_type: s.supplier_type,
      };
    });
    unified.forEach((u) => {
      map[u._id.toString()] = {
        _id: u._id,
        business_name:
          u.supplierProfile?.business_name ||
          `${u.first_name || ""} ${u.last_name || ""}`.trim(),
        business_address: u.supplierProfile?.business_address || u.location || "",
        business_email_address: u.email || "",
        business_tel: u.tel_num || "",
        profile_pic: u.profile_pic || "",
        supplier_type: u.supplierProfile?.supplier_type,
      };
    });
    return map;
  }

  static _mapStock(s, supplierMap) {
    const rawId = s.supplier_id && s.supplier_id._id ? s.supplier_id._id : s.supplier_id;
    const key = rawId ? rawId.toString() : null;
    const supplier = key ? supplierMap[key] : null;
    return {
      _id: s._id,
      supplier_id: supplier?._id || rawId,
      product_name: s.product_name,
      product_quantity: s.product_quantity,
      product_price: s.product_price,
      status: s.status,
      product_image: s.product_image,
      product_images: s.product_images || [],
      category: s.category || "Other",
      description: s.description || "",
      unit: s.unit || "piece",
      variants: s.variants || [],
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      __v: s.__v,
      supplier: supplier || undefined,
      supplier_name: supplier?.business_name || "",
      business_name: supplier?.business_name || "",
    };
  }

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
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;
      const { search, category } = req.query;

      // Build filter
      const filter = {};
      if (search) filter.product_name = { $regex: search, $options: "i" };
      if (category && category !== "All") filter.category = category;

      const totalDocuments = await supplierStockModel.find(filter).countDocuments();
      const totalPages = Math.ceil(totalDocuments / pageSize);
      const skipDocuments = (page - 1) * pageSize;

      const stocks = await supplierStockModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skipDocuments)
        .limit(pageSize);

      const supplierMap = await SupplierController._resolveSuppliers(stocks);
      const results = stocks.map((s) => SupplierController._mapStock(s, supplierMap));

      res.status(200).json({
        totalDocuments,
        totalPages,
        currentPage: page,
        pageSize,
        data: results,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
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
      let singleSupplier = await supplierModel.findById(supplierId).populate("supplier_type", "name");
      if (!singleSupplier) {
        const unified = await userModel.findById(supplierId).populate("supplierProfile.supplier_type", "name");
        const hasSupplierRole =
          unified &&
          (unified.activeRole === "supplier" ||
            (Array.isArray(unified.roles) && unified.roles.includes("supplier")) ||
            unified.supplierProfile);
        if (hasSupplierRole) {
          singleSupplier = {
            _id: unified._id,
            business_name: unified.supplierProfile?.business_name || `${unified.first_name || ""} ${unified.last_name || ""}`.trim(),
            business_email_address: unified.email,
            business_tel: unified.tel_num,
            business_address: unified.supplierProfile?.business_address || unified.location,
            TIN: unified.supplierProfile?.TIN,
            supplier_type: unified.supplierProfile?.supplier_type,
            profile_pic: unified.profile_pic,
            balance: unified.balance || 0,
            active: unified.active,
            role: unified.activeRole,
            createdAt: unified.createdAt,
            updatedAt: unified.updatedAt,
            __v: unified.__v,
          };
        }
      }

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
      let imagePaths = [];
      if (req.files && req.files.length > 0) {
        imagePaths = await fileStoreMiddleware(
          req,
          `${req.body.supplier}_stock`
        );
      } else if (req.file) {
        const imagePath = await fileStoreMiddleware(
          req,
          `${req.body.supplier}_stock`
        );
        imagePaths = Array.isArray(imagePath) ? imagePath : [imagePath];
      }
      if (imagePaths.length > 0) {
        req.body.product_image = imagePaths[0];
        req.body.product_images = imagePaths;
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
        product_image: req.body.product_image || "",
        product_images: req.body.product_images || [],
        category: req.body.category || "Other",
        description: req.body.description || "",
        unit: req.body.unit || "piece",
        variants,
      });
      await stock.save();
      const supplierMap = await SupplierController._resolveSuppliers([stock]);
      const result = SupplierController._mapStock(stock, supplierMap);
      if (stock) {
        res.status(200).json({ message: `${req.body.product_name} created successfully`, data: result });
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
      const supplierMap = await SupplierController._resolveSuppliers(stock);
      const results = stock.map((s) => SupplierController._mapStock(s, supplierMap));
      if (stock) {
        res.status(200).json({
          totalDocuments,
          totalPages,
          currentPage: page,
          pageSize,
          data: results,
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
      let imagePaths = [];
      if (req.files && req.files.length > 0) {
        imagePaths = await fileStoreMiddleware(
          req,
          `${req.body.supplier}_stock`
        );
      } else if (req.file) {
        const imagePath = await fileStoreMiddleware(
          req,
          `${req.body.supplier}_stock`
        );
        imagePaths = Array.isArray(imagePath) ? imagePath : [imagePath];
      }
      if (imagePaths.length > 0) {
        req.body.product_image = imagePaths[0];
        req.body.product_images = imagePaths;
      } else {
        const oldStock = await supplierStockModel.findOne({ _id: req.params.id });
        if (!req.body.product_image) req.body.product_image = oldStock.product_image;
        if (!req.body.product_images) req.body.product_images = oldStock.product_images || [];
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
      let result = null;
      if (stock) {
        const supplierMap = await SupplierController._resolveSuppliers([stock]);
        result = SupplierController._mapStock(stock, supplierMap);
      }
      if (stock) {
        res.status(200).json({ message: "stock updated successfully", data: result });
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

      // If location filter, first find matching supplier IDs (legacy + unified)
      if (location) {
        const [matchingSuppliers, matchingUnified] = await Promise.all([
          supplierModel
            .find({
              $or: [
                { business_address: { $regex: location, $options: "i" } },
                { business_name: { $regex: location, $options: "i" } },
              ],
            })
            .select("_id"),
          userModel
            .find({
              $or: [
                { "supplierProfile.business_address": { $regex: location, $options: "i" } },
                { "supplierProfile.business_name": { $regex: location, $options: "i" } },
                { location: { $regex: location, $options: "i" } },
              ],
            })
            .select("_id"),
        ]);
        stockFilter.supplier_id = {
          $in: [
            ...matchingSuppliers.map((s) => s._id),
            ...matchingUnified.map((u) => u._id),
          ],
        };
      }

      const stock = await supplierStockModel
        .find(stockFilter)
        .sort({ createdAt: -1 })
        .limit(100);

      const supplierMap = await SupplierController._resolveSuppliers(stock);
      const results = stock.map((s) => {
        const mapped = SupplierController._mapStock(s, supplierMap);
        return {
          _id: mapped._id,
          productName: mapped.product_name,
          productPrice: mapped.product_price,
          productQuantity: mapped.product_quantity,
          productImage: mapped.product_image,
          productImages: mapped.product_images,
          status: mapped.status,
          category: mapped.category,
          description: mapped.description,
          unit: mapped.unit,
          variants: mapped.variants,
          supplierId: mapped.supplier_id,
          supplierName: mapped.supplier_name,
          supplierAddress: supplierMap[mapped.supplier_id?.toString()]?.business_address || "",
        };
      });

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

  static async update_profile_picture(req, res) {
    let imageUrl = "";
    try {
      const { id } = req.params;
      let profilePic = null;
      const supplier = await supplierModel.findById(id);
      if (supplier) {
        if (req.file) imageUrl = await fileStoreMiddleware(req, "photos");
        supplier.profile_pic = imageUrl || supplier.profile_pic;
        await supplier.save();
        profilePic = supplier.profile_pic;
      } else {
        const user = await userModel.findById(id);
        if (!user) {
          return res.status(404).json({ message: "Supplier not found" });
        }
        if (req.file) imageUrl = await fileStoreMiddleware(req, "photos");
        user.profile_pic = imageUrl || user.profile_pic;
        await user.save();
        profilePic = user.profile_pic;
      }
      return res.status(200).json({ message: "Profile picture updated successfully", data: { profile_pic: profilePic } });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }


}
module.exports = SupplierController;
