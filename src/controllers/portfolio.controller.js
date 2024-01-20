const date = require("../global");
const portfolioModel = require("../models/portifolio.model");
class PortfolioController {
  static async get(req, res) {
    try {
      const portfolio = await portfolioModel.find({ ownerId: req.params.id });
      if (portfolio) {
        res.status(200).json(portfolio);
      } else {
        res.status(404).json({ message: "portfolio not found" });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  // store portfolio in model
  static async store(req, res) {
    try {
      const portfolio = new portfolioModel({
        ownerId: req.body.ownerId,
        clientName: req.body.clientName,
        description: req.body.description,
        projectName: req.body.projectName,
        snaps: req.files.map(
          (file) =>
            `https://buildup-resources.s3.amazonaws.com/buildUp-${req.params.name}/photos/${date}-${file.originalname}`
        ),
      });

      await portfolio.save();
      res.status(200).json({ message: "Portfolio saved successfully.." });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  static async delete(req, res) {
    try {
      const deleted = await portfolioModel.findByIdAndDelete(req.params.id);
      if (deleted) {
        res.status(200).json({ message: "portfolio deleted successfully" });
      } else {
        res.status(404).json({ message: "portfolio not found" });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  //   update portfolio
  static async update(req, res) {
    try {
      const portfolio = await portfolioModel.findOne(req.params.id);
      if (portfolio) {
        const updatedPortfolio = await portfolioModel.findByIdAndUpdate(
          req.params.id,
          {
            $set: {
              clientName:
                req.body.clientName == ""
                  ? portfolio.clientName
                  : req.body.clientName,
              description:
                req.body.description == ""
                  ? portfolio.description
                  : req.body.description,
              projectName:
                req.body.projectName == ""
                  ? portfolio.projectName
                  : req.body.projectName,
              snaps:
                req.files == null
                  ? portfolio.snaps
                  : req.files.map(
                      (file) =>
                        `https://buildup-resources.s3.amazonaws.com/buildUp-${req.params.name}/photos/${date}-${file.originalname}`
                    ),
            },
          },
          {
            new: true,
          }
        );
        await updatedPortfolio.save();
        res.status(200).json({
          message: "portfolio updated successfully",
          data: updatedPortfolio,
        });
      } else {
        res.status(400).json({ message: "portfolio not found" });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
module.exports = PortfolioController;
