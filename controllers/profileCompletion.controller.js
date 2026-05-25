const freelancerModel = require("../models/freelancer.model");
const fileStoreMiddleware = require("../helpers/file_helper");

class ProfileCompletionController {
  // PATCH /profile/complete/:role/:userId
  static async complete(req, res) {
    try {
      const { userId } = req.params;
      const { bio, yearsOfExperience, location, skills, certifications } = req.body;

      const updateData = {
        profileCompleted: true,
      };
      if (bio !== undefined) updateData.bio = bio;
      if (yearsOfExperience !== undefined) updateData.yearsOfExperience = Number(yearsOfExperience);
      if (location !== undefined) updateData.location = location;
      if (skills !== undefined) updateData.skills = Array.isArray(skills) ? skills : [];
      if (certifications !== undefined) updateData.certifications = Array.isArray(certifications) ? certifications : [];

      // Handle profile image (base64 stored as-is or via file helper)
      if (req.body.profileImage) {
        updateData.profile_pic = req.body.profileImage;
      }

      const updated = await freelancerModel.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true }
      ).select("-password -otp -otpToken -passwordResetToken");

      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json({ message: "Profile completed successfully", data: updated });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
}

module.exports = ProfileCompletionController;
