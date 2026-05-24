'use strict';

jest.mock('../src/models/User');
jest.mock('../src/models/RefreshToken');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../src/services/socialAuthService');

const User = require('../src/models/User');
const RefreshToken = require('../src/models/RefreshToken');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verifySocialIdentity } = require('../src/services/socialAuthService');

const { signup, login, refresh, logout, socialLogin } = require('../src/controllers/authController');

// ─── helpers ──────────────────────────────────────────────────────────────────
function makeReq(bodyOverrides = {}, validatedOverrides = {}) {
  return {
    validated: { body: { email: 'user@example.com', password: 'password123', ...validatedOverrides } },
    body: { email: 'user@example.com', password: 'password123', ...bodyOverrides }
  };
}

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const next = jest.fn();

const MOCK_USER = {
  _id: 'uid1',
  email: 'user@example.com',
  role: 'user',
  passwordHash: '$2a$12$hashedpassword',
  lastLoginAt: null,
  save: jest.fn().mockResolvedValue(true)
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  // jwt.sign returns a fake token; jwt.verify/decode set up per test
  jwt.sign.mockReturnValue('mock.jwt.token');
  jwt.decode.mockReturnValue({ jti: 'mock-jti' });
  bcrypt.hash.mockResolvedValue('$2a$12$hashed');
  bcrypt.compare.mockResolvedValue(true);
  RefreshToken.create.mockResolvedValue({});
});

// ─── signup ───────────────────────────────────────────────────────────────────
describe('authController.signup', () => {
  it('returns 201 with tokens on success', async () => {
    User.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    User.create.mockResolvedValue(MOCK_USER);

    const req = makeReq({}, { email: 'user@example.com', password: 'password123' });
    const res = makeRes();
    await signup(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ tokens: expect.any(Object) }) })
    );
  });

  it('calls next with 409 AppError when email already exists', async () => {
    User.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(MOCK_USER) });

    const req = makeReq({}, { email: 'user@example.com', password: 'password123' });
    const res = makeRes();
    await signup(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 }));
  });

  it('calls next on unexpected DB error', async () => {
    User.findOne.mockReturnValue({ lean: jest.fn().mockRejectedValue(new Error('DB failure')) });

    const req = makeReq({}, { email: 'user@example.com', password: 'password123' });
    await signup(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ─── login ────────────────────────────────────────────────────────────────────
describe('authController.login', () => {
  it('returns 200 with tokens on valid credentials', async () => {
    User.findOne.mockResolvedValue({ ...MOCK_USER, save: jest.fn().mockResolvedValue(true) });

    const req = makeReq({}, { email: 'user@example.com', password: 'password123' });
    const res = makeRes();
    await login(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('calls next with 401 when user not found', async () => {
    User.findOne.mockResolvedValue(null);

    await login(makeReq({}, { email: 'unknown@example.com', password: 'password123' }), makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next with 401 when password does not match', async () => {
    User.findOne.mockResolvedValue({ ...MOCK_USER, save: jest.fn() });
    bcrypt.compare.mockResolvedValue(false);

    await login(makeReq({}, { email: 'user@example.com', password: 'wrongpass' }), makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next with 401 when user has no password hash', async () => {
    User.findOne.mockResolvedValue({
      ...MOCK_USER,
      passwordHash: null,
      authProviders: { password: false, googleSub: 'google-sub-1' },
      save: jest.fn()
    });

    await login(makeReq({}, { email: 'user@example.com', password: 'password123' }), makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('calls next on unexpected error', async () => {
    User.findOne.mockRejectedValue(new Error('timeout'));
    await login(makeReq(), makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ─── refresh ──────────────────────────────────────────────────────────────────
describe('authController.refresh', () => {
  const STORED_TOKEN = {
    tokenHash: expect.any(String),
    revokedAt: null,
    expiresAt: new Date(Date.now() + 1000 * 3600),
    replacedByJti: null,
    save: jest.fn().mockResolvedValue(true)
  };

  it('returns 200 with new tokens on valid refresh token', async () => {
    jwt.verify.mockReturnValue({ type: 'refresh', sub: 'uid1', jti: 'jti1' });
    RefreshToken.findOne.mockResolvedValue({ ...STORED_TOKEN, expiresAt: new Date(Date.now() + 1000 * 3600), save: jest.fn() });
    User.findById.mockResolvedValue(MOCK_USER);

    const req = makeReq({}, { refreshToken: 'mock.jwt.token' });
    const res = makeRes();
    await refresh(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('calls next with 401 when jwt.verify throws', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('invalid'); });

    await refresh(makeReq({}, { refreshToken: 'bad.token' }), makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next with 401 when token type is not refresh', async () => {
    jwt.verify.mockReturnValue({ type: 'access', sub: 'uid1', jti: 'jti1' });
    await refresh(makeReq({}, { refreshToken: 'mock.jwt.token' }), makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next with 401 when stored token not found', async () => {
    jwt.verify.mockReturnValue({ type: 'refresh', sub: 'uid1', jti: 'jti1' });
    RefreshToken.findOne.mockResolvedValue(null);

    await refresh(makeReq({}, { refreshToken: 'mock.jwt.token' }), makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next with 401 when token is revoked', async () => {
    jwt.verify.mockReturnValue({ type: 'refresh', sub: 'uid1', jti: 'jti1' });
    RefreshToken.findOne.mockResolvedValue({ ...STORED_TOKEN, revokedAt: new Date(), save: jest.fn() });

    await refresh(makeReq({}, { refreshToken: 'mock.jwt.token' }), makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next with 401 when token is expired', async () => {
    jwt.verify.mockReturnValue({ type: 'refresh', sub: 'uid1', jti: 'jti1' });
    RefreshToken.findOne.mockResolvedValue({
      ...STORED_TOKEN,
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      save: jest.fn()
    });

    await refresh(makeReq({}, { refreshToken: 'mock.jwt.token' }), makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next with 401 when user no longer exists', async () => {
    jwt.verify.mockReturnValue({ type: 'refresh', sub: 'uid1', jti: 'jti1' });
    RefreshToken.findOne.mockResolvedValue({ ...STORED_TOKEN, expiresAt: new Date(Date.now() + 3600000), save: jest.fn() });
    User.findById.mockResolvedValue(null);

    await refresh(makeReq({}, { refreshToken: 'mock.jwt.token' }), makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next on unexpected error', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('network'); });
    // Even though jwt throws, inner catch re-throws AppError; the outer catch calls next
    await refresh(makeReq({}, { refreshToken: 'token' }), makeRes(), next);
    expect(next).toHaveBeenCalled();
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────
describe('authController.logout', () => {
  it('returns 200 on successful logout', async () => {
    RefreshToken.updateOne.mockResolvedValue({});

    const req = makeReq({}, { refreshToken: 'mock.jwt.token' });
    const res = makeRes();
    await logout(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ message: expect.any(String) }) })
    );
  });

  it('calls next on DB error during logout', async () => {
    RefreshToken.updateOne.mockRejectedValue(new Error('update failed'));
    await logout(makeReq({}, { refreshToken: 'token' }), makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('authController.socialLogin', () => {
  it('returns 200 and links existing user by provider sub', async () => {
    verifySocialIdentity.mockResolvedValue({
      provider: 'google',
      providerSub: 'google-sub-1',
      email: 'user@example.com',
      emailVerified: true,
      displayName: 'Test User'
    });

    User.findOne
      .mockResolvedValueOnce({
        ...MOCK_USER,
        authProviders: { password: true, googleSub: 'google-sub-1', appleSub: null },
        save: jest.fn().mockResolvedValue(true)
      });

    const req = makeReq({}, { provider: 'google', idToken: 'id-token', nonce: null });
    const res = makeRes();

    await socialLogin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('creates a new user when provider sub and email are not found', async () => {
    verifySocialIdentity.mockResolvedValue({
      provider: 'google',
      providerSub: 'google-sub-new',
      email: 'new@example.com',
      emailVerified: true,
      displayName: null
    });

    User.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    User.create.mockResolvedValue({
      ...MOCK_USER,
      _id: 'uid2',
      email: 'new@example.com',
      passwordHash: null,
      authProviders: { password: false, googleSub: 'google-sub-new', appleSub: null }
    });

    const req = makeReq({}, { provider: 'google', idToken: 'id-token', nonce: null });
    const res = makeRes();

    await socialLogin(req, res, next);

    expect(User.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 400 when first-time social login has no email', async () => {
    verifySocialIdentity.mockResolvedValue({
      provider: 'apple',
      providerSub: 'apple-sub-1',
      email: null,
      emailVerified: false,
      displayName: null
    });

    User.findOne
      .mockResolvedValueOnce(null);

    const req = makeReq({}, { provider: 'apple', idToken: 'id-token', nonce: 'nonce' });
    await socialLogin(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('calls next when provider verification fails', async () => {
    verifySocialIdentity.mockRejectedValue(new Error('verification failed'));

    const req = makeReq({}, { provider: 'google', idToken: 'id-token', nonce: null });
    await socialLogin(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
