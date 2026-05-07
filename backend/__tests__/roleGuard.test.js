const { requireRole, requireAdmin, requireUser } = require('../src/middleware/roleGuard');
const { AppError } = require('../src/middleware/errorHandler');

describe('roleGuard', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: {
        id: 'user-123',
        email: 'user@example.com'
      }
    };
    res = {};
    next = jest.fn();
  });

  describe('requireRole', () => {
    it('should allow user with matching role', () => {
      req.user.role = 'admin';
      const middleware = requireRole('admin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow user with one of multiple allowed roles', () => {
      req.user.role = 'user';
      const middleware = requireRole('user', 'admin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should deny user with disallowed role', () => {
      req.user.role = 'user';
      const middleware = requireRole('admin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.message).toContain('Access denied');
      expect(error.message).toContain('admin');
    });

    it('should fail if role is missing from user context', () => {
      delete req.user.role;
      const middleware = requireRole('admin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toContain('role not found');
    });

    it('should fail if user object is missing', () => {
      delete req.user;
      const middleware = requireRole('admin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    it('should support multiple required roles', () => {
      req.user.role = 'moderator';
      const middleware = requireRole('admin', 'moderator');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should include all required roles in error message', () => {
      req.user.role = 'user';
      const middleware = requireRole('admin', 'moderator', 'super_admin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('admin');
      expect(error.message).toContain('moderator');
      expect(error.message).toContain('super_admin');
    });
  });

  describe('requireAdmin', () => {
    it('should allow user with admin role', () => {
      req.user.role = 'admin';

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should deny user with non-admin role', () => {
      req.user.role = 'user';

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
    });

    it('should fail if role is missing', () => {
      delete req.user.role;

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });
  });

  describe('requireUser', () => {
    it('should allow user with user role', () => {
      req.user.role = 'user';

      requireUser(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow user with admin role', () => {
      req.user.role = 'admin';

      requireUser(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should deny user with invalid role', () => {
      req.user.role = 'guest';

      requireUser(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
    });
  });
});
