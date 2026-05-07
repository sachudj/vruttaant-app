const { AppError } = require('./errorHandler');

/**
 * Check if user has required role
 * Used in route handlers after verifyAccessToken and verifyUserExists
 * req.user.role must be set before calling this middleware
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return next(new AppError(401, 'User role not found in token claims.'));
    }

    if (!allowedRoles.includes(userRole)) {
      return next(new AppError(
        403,
        `Access denied. Required role: ${allowedRoles.join(' or ')}.`
      ));
    }

    return next();
  };
}

/**
 * Convenience middleware to require admin role
 */
function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

/**
 * Convenience middleware to require user role (default, but explicit for clarity)
 */
function requireUser(req, res, next) {
  return requireRole('user', 'admin')(req, res, next);
}

module.exports = {
  requireRole,
  requireAdmin,
  requireUser
};
