const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { AppError } = require('./errorHandler');

function resolveJwtAccessSecret() {
  if (process.env.JWT_ACCESS_SECRET) {
    return process.env.JWT_ACCESS_SECRET;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new AppError(500, 'JWT_ACCESS_SECRET must be configured in production.');
  }

  return 'dev-access-secret-change-me';
}

function resolveJwtRefreshSecret() {
  if (process.env.JWT_REFRESH_SECRET) {
    return process.env.JWT_REFRESH_SECRET;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new AppError(500, 'JWT_REFRESH_SECRET must be configured in production.');
  }

  return 'dev-refresh-secret-change-me';
}

/**
 * Extract JWT from Authorization header
 * Expected format: "Bearer <token>"
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Middleware to verify access token and attach user context
 * Extracts JWT from Authorization header, verifies signature,
 * looks up user, and attaches to req.user
 */
function verifyAccessToken(req, res, next) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return next(new AppError(401, 'Authorization header missing or malformed.'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, resolveJwtAccessSecret());
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return next(new AppError(401, 'Access token expired.'));
      }
      if (error.name === 'JsonWebTokenError') {
        return next(new AppError(401, 'Invalid access token.'));
      }
      throw error;
    }

    // Attach decoded token claims to request
    req.tokenClaims = decoded;

    // Optionally lookup user from database for fresh data
    // For now, we rely on the token claims (sub = userId)
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      email: decoded.email
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Middleware to verify refresh token
 * Checks token validity AND ensures it hasn't been revoked
 * Refresh tokens should only be used at /refresh endpoint
 */
function verifyRefreshToken(req, res, next) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return next(new AppError(401, 'Authorization header missing or malformed.'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, resolveJwtRefreshSecret());
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return next(new AppError(401, 'Refresh token expired.'));
      }
      if (error.name === 'JsonWebTokenError') {
        return next(new AppError(401, 'Invalid refresh token.'));
      }
      throw error;
    }

    if (decoded.type !== 'refresh') {
      return next(new AppError(401, 'Token is not a refresh token.'));
    }

    // Attach decoded token claims to request
    req.tokenClaims = decoded;
    req.user = {
      id: decoded.sub
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Middleware to verify refresh token is not revoked
 * Should be used in conjunction with verifyRefreshToken
 * Checks RefreshToken table for revocation status
 */
async function verifyRefreshTokenNotRevoked(req, res, next) {
  try {
    const jti = req.tokenClaims?.jti;
    const userId = req.user?.id;

    if (!jti || !userId) {
      return next(new AppError(401, 'Invalid token claims.'));
    }

    const storedToken = await RefreshToken.findOne({
      userId,
      jti
    });

    if (!storedToken) {
      return next(new AppError(401, 'Refresh token not found.'));
    }

    if (storedToken.revokedAt) {
      return next(new AppError(401, 'Refresh token has been revoked.'));
    }

    if (new Date() > storedToken.expiresAt) {
      return next(new AppError(401, 'Refresh token has expired.'));
    }

    // Attach the stored token for later use in controllers
    req.storedRefreshToken = storedToken;

    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Middleware to verify user exists in database
 * Used after verifyAccessToken to ensure user hasn't been deleted
 * Optional: use for stricter access control
 */
async function verifyUserExists(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return next(new AppError(401, 'User ID not found in token claims.'));
    }

    const user = await User.findById(userId);

    if (!user) {
      return next(new AppError(401, 'User not found.'));
    }

    // Attach fresh user data to request
    req.user = {
      id: String(user._id),
      email: user.email,
      role: user.role
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Optional auth middleware — extracts user from JWT if present but does NOT reject
 * requests without a token. Use on public endpoints that support personalization.
 */
function optionalAuth(req, res, next) {
  const token = extractTokenFromHeader(req.headers.authorization);
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, resolveJwtAccessSecret());
    req.tokenClaims = decoded;
    req.user = { id: decoded.sub, role: decoded.role, email: decoded.email };
  } catch {
    // Invalid / expired token — treat as anonymous
  }

  return next();
}

module.exports = {
  verifyAccessToken,
  verifyRefreshToken,
  verifyRefreshTokenNotRevoked,
  verifyUserExists,
  optionalAuth,
  extractTokenFromHeader
};
