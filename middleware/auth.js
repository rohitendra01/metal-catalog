module.exports.isAuthenticated = (req, res, next) => {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    // For API routes, return 401 JSON
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
    // For page routes, redirect to login
    return res.redirect('/login');
};
