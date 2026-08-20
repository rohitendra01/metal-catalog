const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { isAuthenticated } = require('../middleware/auth');
const ctrl = require('../controllers/productController');
const categoryCtrl = require('../controllers/categoryController');

router.get('/categories', categoryCtrl.getCategories);
router.post('/categories', isAuthenticated, categoryCtrl.createCategory);
router.delete('/categories/:id', isAuthenticated, categoryCtrl.deleteCategory);

router.get('/products', ctrl.listProducts);
router.get('/products/:id', ctrl.getProduct);
router.post('/products', isAuthenticated, upload.array('images', 6), ctrl.createProduct);
router.put('/products/:id', isAuthenticated, upload.array('images', 6), ctrl.updateProduct);
router.delete('/products/:id', isAuthenticated, ctrl.deleteProduct);

module.exports = router;