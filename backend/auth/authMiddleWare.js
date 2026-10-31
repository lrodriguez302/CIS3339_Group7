const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Verify that the request contains a valid JWT
function requireAuth(req, res, next) {
  const authorization = req.header('Authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      message: 'No token, authorization denied'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (
      !decoded.orgId ||
      !decoded.role ||
      !mongoose.Types.ObjectId.isValid(decoded.orgId)
    ) {
      return res.status(401).json({
        message: 'Invalid token'
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      message: 'Token is not valid'
    });
  }
}

// Check whether the authenticated user has the required role
function requireRole(role) {
  return function requireRoleGuard(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required'
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    next();
  };
}

// Preserve compatibility with existing route imports
module.exports = requireAuth;
module.exports.requireAuth = requireAuth;
module.exports.requireRole = requireRole;
