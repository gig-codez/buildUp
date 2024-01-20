class SearchController {
  static async query(req, res) {
    try {
      const { profession, category, minPrice, maxPrice,supplier } = req.query;

      let query = {};

      if (profession) {
        query.profession = profession;
      }

      if (category) {
        query.category = category;
      }

      if (minPrice || maxPrice) {
        query.price = { $gte: minPrice, $lte: maxPrice };
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}
module.exports = SearchController;
