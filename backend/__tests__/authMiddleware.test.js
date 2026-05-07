const jwt = require('jsonwebtoken');
const {
  verifyAccessToken,
  verifyRefreshToken,
  verifyRefreshTokenNotRevoked,
  verifyUserExists,
  extractTokenFromHeader
} = require('../src/middleware/authMiddleware');
const User = require('../src/models/User');
const RefreshToken = require('../src/models/RefreshToken');
const { AppError } = require('../src/middleware/errorHandler');

jest.mock('jsonwebtoken');
jest.mock('../src/models/User');
jest.mock('../src/models/RefreshToken');

describe('authMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      headers: {}
    };
    res = {};
    next = jest.fn();
    // Set env vars
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.NODE_ENV = 'development';
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = extractTokenFromHeader('Bearer my-token-123');
      expect(token).toBe('my-token-123');
    });

    it('should extract token with case-insensitive Bearer prefix', () => {
      const token = extractTokenFromHeader('bearer my-token-123');
      expect(token).toBe('my-token-123');
    });

    it('should return null for missing header', () => {
      const token = extractTokenFromHeader(null);
      expect(token).toBeNull();
    });

    it('should return null for empty header', () => {
      const token = extractTokenFromHeader('');
      expect(token).toBeNull();
    });

    it('should return null for malformed header (no Bearer prefix)', () => {
      const token = extractTokenFromHeader('my-token-123');
      expect(token).toBeNull();
    });

    it('should return null for malformed header (wrong number of parts)', () => {
      const token = extractTokenFromHeader('Bearer token extra-part');
      expect(token).toBeNull();
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token and attach user context', () => {
      const validToken = 'valid-access-token';
      const decodedPayload = {
        sub: 'user-123',
        email: 'user@example.com',
        role: 'user'
      };

      jwt.verify.mockReturnValue(decodedPayload);
      req.headers.authorization = `Bearer ${validToken}`;

      verifyAccessToken(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(validToken, 'test-access-secret');
      expect(req.user).toEqual({
        id: 'user-123',
        email: 'user@example.com',
        role: 'user'
      });
      expect(req.tokenClaims).toEqual(decodedPayload);
      expect(next).toHaveBeenCalledWith();
    });

    it('should fail for missing authorization header', () => {
      req.headers.authorization = undefined;

      verifyAccessToken(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toContain('Authorization header');
    });

    it('should fail for malformed authorization header', () => {
      req.headers.authorization = 'NotBearer token';

      verifyAccessToken(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    it('should fail for expired access token', () => {
      const expiredToken = 'expired-token';
      req.headers.authorization = `Bearer ${expiredToken}`;

      const tokenError = new jwt.TokenExpiredError('jwt expired', new Date());
      tokenError.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => {
        throw tokenError;
      });

      verifyAccessToken(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toContain('expired');
    });

    it('should fail for invalid access token signature', () => {
      const invalidToken = 'invalid-token';
      req.headers.authorization = `Bearer ${invalidToken}`;

      const tokenError = new Error('invalid signature');
      tokenError.name = 'JsonWebTokenError';
      jwt.verify.mockImplementation(() => {
        throw tokenError;
      });

      verifyAccessToken(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toContain('Invalid access token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const validToken = 'valid-refresh-token';
      const decodedPayload = {
        sub: 'user-123',
        jti: 'token-jti-123',
        type: 'refresh'
      };

      jwt.verify.mockReturnValue(decodedPayload);
      req.headers.authorization = `Bearer ${validToken}`;

      verifyRefreshToken(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(validToken, 'test-refresh-secret');
      expect(req.user).toEqual({
        id: 'user-123'
      });
      expect(req.tokenClaims).toEqual(decodedPayload);
      expect(next).toHaveBeenCalledWith();
    });

    it('should fail for missing authorization header', () => {
      req.headers.authorization = undefined;

      verifyRefreshToken(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    it('should fail if token type is not refresh', () => {
      const token = 'access-token-not-refresh';
      const decodedPayload = {
        sub: 'user-123',
        jti: 'token-jti-123',
        type: 'access' // wrong type
      };

      jwt.verify.mockReturnValue(decodedPayload);
      req.headers.authorization = `Bearer ${token}`;

      verifyRefreshToken(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toContain('not a refresh token');
    });

    it('should fail for expired refresh token', () => {
      const expiredToken = 'expired-refresh-token';
      req.headers.authorization = `Bearer ${expiredToken}`;

      const tokenError = new jwt.TokenExpiredError('jwt expired', new Date());
      tokenError.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => {
        throw tokenError;
      });

      verifyRefreshToken(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toContain('expired');
    });
  });

  describe('verifyRefreshTokenNotRevoked', () => {
    it('should allow non-revoked refresh token', async () => {
      req.user = { id: 'user-123' };
      req.tokenClaims = { jti: 'token-jti-123' };

      const storedToken = {
        userId: 'user-123',
        jti: 'token-jti-123',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      };

      RefreshToken.findOne.mockResolvedValue(storedToken);

      await verifyRefreshTokenNotRevoked(req, res, next);

      expect(RefreshToken.findOne).toHaveBeenCalledWith({
        userId: 'user-123',
        jti: 'token-jti-123'
      });
      expect(req.storedRefreshToken).toEqual(storedToken);
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject revoked refresh token', async () => {
      req.user = { id: 'user-123' };
      req.tokenClaims = { jti: 'token-jti-123' };

      const revokedToken = {
        userId: 'user-123',
        jti: 'token-jti-123',
        revokedAt: new Date(Date.now() - 60 * 1000), // revoked 1 minute ago
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      RefreshToken.findOne.mockResolvedValue(revokedToken);

      await verifyRefreshTokenNotRevoked(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toContain('revoked');
    });

    it('should reject token not found in storage', async () => {
      req.user = { id: 'user-123' };
      req.tokenClaims = { jti: 'unknown-jti' };

      RefreshToken.findOne.mockResolvedValue(null);

      await verifyRefreshTokenNotRevoked(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toContain('not found');
    });

    it('should reject token with expiration date in past', async () => {
      req.user = { id: 'user-123' };
      req.tokenClaims = { jti: 'expired-jti' };

      const expiredToken = {
        userId: 'user-123',
        jti: 'expired-jti',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000) // expired 1 second ago
      };

      RefreshToken.findOne.mockResolvedValue(expiredToken);

      await verifyRefreshTokenNotRevoked(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toContain('expired');
    });
  });

  describe('verifyUserExists', () => {
    it('should verify user exists and attach fresh user data', async () => {
      req.user = { id: 'user-123' };

      const userData = {
        _id: 'user-123',
        email: 'user@example.com',
        role: 'admin'
      };

      User.findById.mockResolvedValue(userData);

      await verifyUserExists(req, res, next);

      expect(User.findById).toHaveBeenCalledWith('user-123');
      expect(req.user).toEqual({
        id: 'user-123',
        email: 'user@example.com',
        role: 'admin'
      });
      expect(next).toHaveBeenCalledWith();
    });

    it('should fail if user not found in database', async () => {
      req.user = { id: 'non-existent-user' };

      User.findById.mockResolvedValue(null);

      await verifyUserExists(req, res, next);

      expect(User.findById).toHaveBeenCalledWith('non-existent-user');
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toContain('User not found');
    });

    it('should fail if user ID is missing from token claims', async () => {
      req.user = {}; // no id

      await verifyUserExists(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      req.user = { id: 'user-123' };
      const dbError = new Error('Database connection failed');

      User.findById.mockRejectedValue(dbError);

      await verifyUserExists(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });
});
