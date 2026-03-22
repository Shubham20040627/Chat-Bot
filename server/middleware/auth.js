const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Get token from header
    // Format: "Bearer <token>"
    const tokenHeader = req.header('Authorization');

    // Check if no token
    if (!tokenHeader) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const token = tokenHeader.split(' ')[1]; // Remove "Bearer "

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Add user to request
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};
