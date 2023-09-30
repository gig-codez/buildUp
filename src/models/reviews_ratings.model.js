const { default: mongoose } = require("mongoose");
const reviewsRatingsSchema = new mongoose.Schema({
  review_id: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  user_id: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  review_message: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
  },
});
module.exports = mongoose.model("reviewsRatings", reviewsRatingsSchema);
