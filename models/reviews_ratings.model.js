const { default: mongoose } = require("mongoose");
const reviewsRatingsSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  reviewer_id: {
    type: String,
    default: "",
  },
  reviewed_role: {
    type: String,
    default: "",
  },
  review_message: {
    type: String,
    default: "",
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
}, { timestamps: true });
module.exports = mongoose.model("reviewsRatings", reviewsRatingsSchema);
