// Must run AFTER authMiddleware, since it relies on req.user already being set
const adminMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access only' });
    }
    next();
};

module.exports = { adminMiddleware };