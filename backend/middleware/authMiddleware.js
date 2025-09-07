const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid.' });
  }
};

// Middleware to check if user is admin
module.exports.isAdmin = function (req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Admins only.' });
};

// Middleware to check if user is cashier
module.exports.isCashier = function (req, res, next) {
  if (req.user && req.user.role === 'cashier') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Cashiers only.' });
};