const { Router } = require("express");
const Notification = require("../models/notifications.model");

const router = Router();

// GET /notifications/:userId?page=1&limit=15
router.get("/:userId", async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 15);
    const skip  = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find({ user: req.params.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ user: req.params.userId }),
    ]);

    res.json({
      notifications,
      total,
      page,
      pages: Math.ceil(total / limit),
      unreadCount: await Notification.countDocuments({ user: req.params.userId, read: false }),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /notifications/:id/read  — mark one as read
router.patch("/:id/read", async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /notifications/:userId/read-all  — mark all as read
router.patch("/:userId/read-all", async (req, res) => {
  try {
    await Notification.updateMany({ user: req.params.userId, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;