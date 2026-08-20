require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');


const app = express();

// --------------- Config ---------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('trust proxy', 1);

// Helmet
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'",
                    'https://cdn.tailwindcss.com', 'https:', 'http:'],
                scriptSrcAttr: ["'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'",
                    'https://cdn.tailwindcss.com', 'https:', 'http:'],
                fontSrc: ["'self'", 'https:', 'http:', 'data:'],
                imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
                connectSrc: ["'self'", 'https:'],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
            },
        },
        crossOriginEmbedderPolicy: false,
    })
);

// Rate limiters
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
    skip: (req) => req.session && req.session.isAdmin,
});

const apiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many API requests, please slow down.' },
});

// --------------- Middleware ---------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Sessions
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            collectionName: 'sessions',
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        },
    })
);

app.use((req, res, next) => {
    res.locals.isAdmin = req.session && req.session.isAdmin;
    res.locals.isDashboard = req.path.startsWith('/admin');
    const rawNumber = process.env.WHATSAPP_NUMBER || '';
    res.locals.whatsappNumber = rawNumber.replace(/\D/g, '');
    next();
});

// --------------- Routes ---------------
const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

app.use('/', publicRoutes);
app.use('/', authLimiter, authRoutes);
app.use('/', adminRoutes);
app.use('/api', apiLimiter, apiRoutes);

// --------------- 404 Handler ---------------
app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Page Not Found',
        message: 'The page you are looking for does not exist.',
        currentPage: '',
    });
});

// --------------- Centralized Error Handler ---------------
app.use((err, req, res, next) => {
    console.error('Error:', err.message);

    const isApi = req.originalUrl.startsWith('/api/');

    if (err instanceof multer.MulterError) {
        const msg =
            err.code === 'LIMIT_FILE_SIZE'
                ? 'File too large. Maximum size is 5MB.'
                : err.message;
        if (isApi) return res.status(400).json({ error: msg });
        return res.status(400).render('error', {
            title: 'Upload Error',
            message: msg,
            currentPage: '',
        });
    }


    // Duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        const msg = `Duplicate value for "${field}"`;
        if (isApi) return res.status(400).json({ error: msg });
        return res.status(400).render('error', {
            title: 'Duplicate Error',
            message: msg,
            currentPage: '',
        });
    }

    // Mongoose Validation Error
    if (err.name === 'ValidationError') {
        const msgs = Object.values(err.errors).map(val => val.message);
        if (isApi) return res.status(400).json({ error: msgs.join('. ') });
        return res.status(400).render('error', {
            title: 'Validation Error',
            message: msgs.join('. '),
            currentPage: '',
        });
    }

    // Cloudinary errors
    if (err.http_code) {
        const msg = 'Image upload failed. Please try again.';
        if (isApi) return res.status(500).json({ error: msg });
    }

    // Catch-all
    if (isApi) {
        return res.status(500).json({ error: 'Internal server error' });
    }
    res.status(500).render('error', {
        title: 'Server Error',
        message: 'Something went wrong on our end. Please try again later.',
        currentPage: '',
    });
});

// --------------- Start Server ---------------
const PORT = process.env.PORT || 3000;

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✓ MongoDB connected');
        require('./controllers/categoryController').seedCategories();
        app.listen(PORT, () => {
            console.log(`✓ Server running on ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('✗ MongoDB connection error:', err.message);
        process.exit(1);
    });

module.exports = app;