const express = require('express');
const AdminController = require('../controllers/admin.controller');
const router = express.Router();
router.delete('/admin/:id', AdminController.delete);
module.exports = router;