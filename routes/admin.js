const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');

// Admin dashboard
router.get('/admin', isAuthenticated, (req, res) => {
    res.render('admin/dashboard', { title: 'Admin Dashboard', layout: false });
});

module.exports = router;
