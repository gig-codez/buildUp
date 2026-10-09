const ReviewModel = require("../models/reviews_ratings.model");

class ReviewController {
  // POST /reviews/add
  static async add(req, res) {
    try {
      const { reviewedId, reviewedRole, rating, comment, reviewerId } = req.body;
      if (!reviewedId || !rating) {
        return res.status(400).json({ message: "reviewedId and rating are required" });
      }
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }
      const review = await ReviewModel.create({
        user_id: reviewedId,
        review_message: comment || "",
        rating: Number(rating),
        reviewer_id: reviewerId,
        reviewed_role: reviewedRole,
      });
      return res.status(201).json({ message: "Review added", data: review });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // GET /reviews/:userId
  static async getByUser(req, res) {
    try {
      const reviews = await ReviewModel.find({ user_id: req.params.userId })
        .sort({ createdAt: -1 });

      const totalReviews = reviews.length;
      const averageRating = totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

      return res.status(200).json({
        data: {
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews,
          reviews,
        },
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
}

module.exports = ReviewController;
