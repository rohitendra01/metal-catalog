const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/productController');

router.get('/', ctrl.getHomePage);
router.get('/products', ctrl.getProductsPage);
router.get('/products/:slug', ctrl.getProductDetail);
router.get('/about', ctrl.getAboutPage);

module.exports = router;
