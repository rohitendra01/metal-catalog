const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        const category = (req.body.category || 'general')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'general';

        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

        return {
            folder: `metal-catalog/${category}`,
            public_id: uniqueName,
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
            transformation: [
                { quality: 'auto', fetch_format: 'auto' },
            ],
        };
    },
});

const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    if (allowed.test(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error('Only image files (jpeg, jpg, png, gif, webp, svg) are allowed'),
            false
        );
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = upload;