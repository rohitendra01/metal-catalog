const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const mongoose = require('mongoose');

// Helper for timing-safe comparison
function timingSafeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const bufferA = Buffer.from(a, 'utf8');
    const bufferB = Buffer.from(b, 'utf8');
    if (bufferA.length !== bufferB.length) {
        crypto.timingSafeEqual(bufferA, bufferA); // Help mitigate timing attacks based on string length
        return false;
    }
    return crypto.timingSafeEqual(bufferA, bufferB);
}

// Render login page
router.get('/login', (req, res) => {
    if (req.session && req.session.isAdmin) {
        return res.redirect('/admin');
    }
    res.render('login', { title: 'Admin Login', error: null, currentPage: '' });
});

// Handle login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USERNAME || '';
    const adminPass = process.env.ADMIN_PASSWORD || '';

    if (timingSafeCompare(username, adminUser) && timingSafeCompare(password, adminPass)) {
        // Enforce single active session by clearing all previous sessions
        try {
            await mongoose.connection.collection('sessions').deleteMany({});
        } catch (err) {
            console.error('Error clearing old sessions:', err);
        }

        // Prevent session fixation
        req.session.regenerate((err) => {
            if (err) {
                console.error('Session regeneration error:', err);
                return res.render('login', {
                    title: 'Admin Login',
                    error: 'Error logging in',
                    currentPage: '',
                });
            }
            req.session.isAdmin = true;
            return res.redirect('/admin');
        });
        return;
    }

    res.render('login', {
        title: 'Admin Login',
        error: 'Invalid username or password',
        currentPage: '',
    });
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.redirect('/');
    });
});

module.exports = router;
