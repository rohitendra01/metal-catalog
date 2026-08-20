const Category = require('../models/Category');

exports.seedCategories = async () => {
    try {
        const count = await Category.countDocuments();
        if (count === 0) {
            const defaults = ['Uncategorized', 'Cookware', 'Knives & Cutting', 'Bakeware', 'Kitchen Tools', 'Storage', 'Specialty Appliances'];
            await Category.insertMany(defaults.map(n => ({ name: n })));
            console.log('✓ Seeded default categories');
        }
    } catch (e) {
        console.error('Error seeding categories:', e);
    }
};

exports.getCategories = async (req, res, next) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.json(categories);
    } catch (err) {
        next(err);
    }
};

exports.createCategory = async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: 'Category name is required' });

        let category = await Category.findOne({ name: new RegExp(`^${name.trim()}$`, 'i') });
        if (category) {
            return res.status(400).json({ error: 'Category already exists' });
        }

        category = new Category({ name: name.trim() });
        await category.save();
        res.status(201).json(category);
    } catch (err) {
        next(err);
    }
};

exports.deleteCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const category = await Category.findById(id);
        if (!category) return res.status(404).json({ error: 'Category not found' });

        const categoryName = category.name;
        await Category.findByIdAndDelete(id);

        // Update all products with this category to 'Uncategorized'
        const Product = require('../models/Product');
        await Product.updateMany({ category: categoryName }, { category: 'Uncategorized' });

        res.json({ message: 'Category deleted and products updated', id });
    } catch (err) {
        next(err);
    }
};

exports.updateCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name || !name.trim()) return res.status(400).json({ error: 'Category name is required' });

        const category = await Category.findById(id);
        if (!category) return res.status(404).json({ error: 'Category not found' });

        const oldName = category.name;
        const newName = name.trim();

        const existing = await Category.findOne({ name: new RegExp(`^${newName}$`, 'i') });
        if (existing && existing._id.toString() !== id) {
            return res.status(400).json({ error: 'Category already exists' });
        }

        category.name = newName;
        await category.save();

        const Product = require('../models/Product');
        await Product.updateMany({ category: oldName }, { category: newName });

        res.json({ message: 'Category updated successfully', category });
    } catch (err) {
        next(err);
    }
};