const request = require('supertest');

jest.mock('../src/models/User', () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));

jest.mock('../src/models/RefreshToken', () => ({
  create: jest.fn()
}));

jest.mock('../src/services/socialAuthService', () => ({
  verifySocialIdentity: jest.fn()
}));

jest.mock('../src/services/socialAuthSecurityService', () => ({
  enforceSingleUseNonce: jest.fn()
}));

const User = require('../src/models/User');
const RefreshToken = require('../src/models/RefreshToken');
const { AppError } = require('../src/middleware/errorHandler');
const { verifySocialIdentity } = require('../src/services/socialAuthService');
const { enforceSingleUseNonce } = require('../src/services/socialAuthSecurityService');
const { app } = require('../src/index');

function expectExactKeys(object, expectedKeys) {
  expect(Object.keys(object).sort()).toEqual([...expectedKeys].sort());
}

describe('social auth contract', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(() => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_ACCESS_SECRET = 'contract-access-secret';
    process.env.JWT_REFRESH_SECRET = 'contract-refresh-secret';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    RefreshToken.create.mockResolvedValue({});
    enforceSingleUseNonce.mockResolvedValue();
  });

  it('keeps POST /api/v1/auth/social success response shape aligned with login response', async () => {
    verifySocialIdentity.mockResolvedValue({
      provider: 'google',
      providerSub: 'google-sub-1',
      email: 'reader@example.com',
      emailVerified: true,
      displayName: 'Reader'
    });

    User.findOne.mockResolvedValue({
      _id: '6650df4b6c48731d5b8d5001',
      email: 'reader@example.com',
      role: 'user',
      passwordHash: null,
      authProviders: { password: false, googleSub: 'google-sub-1', appleSub: null },
      save: jest.fn().mockResolvedValue(true)
    });

    const response = await request(app)
      .post('/api/v1/auth/social')
      .send({
        provider: 'google',
        idToken: 'google-id-token'
      });

    expect(response.statusCode).toBe(200);
    expectExactKeys(response.body, ['success', 'data']);
    expect(response.body.success).toBe(true);
    expectExactKeys(response.body.data, ['user', 'tokens']);
    expectExactKeys(response.body.data.user, ['id', 'email', 'role']);
    expectExactKeys(response.body.data.tokens, ['accessToken', 'refreshToken', 'tokenType', 'expiresIn']);
    expect(typeof response.body.data.tokens.accessToken).toBe('string');
    expect(typeof response.body.data.tokens.refreshToken).toBe('string');
    expect(response.body.data.tokens.tokenType).toBe('Bearer');
  });

  it('keeps POST /api/v1/auth/social validation error envelope shape stable', async () => {
    const response = await request(app)
      .post('/api/v1/auth/social')
      .send({
        provider: 'google'
      });

    expect(response.statusCode).toBe(400);
    expectExactKeys(response.body, ['success', 'error']);
    expect(response.body.success).toBe(false);
    expectExactKeys(response.body.error, ['statusCode', 'message', 'details', 'requestId']);
    expect(response.body.error.statusCode).toBe(400);
    expect(response.body.error.message).toBe('Validation failed.');
    expect(Array.isArray(response.body.error.details)).toBe(true);
  });

  it('keeps POST /api/v1/auth/social auth-failure envelope shape stable', async () => {
    verifySocialIdentity.mockRejectedValue(new AppError(401, 'Invalid Google id token.'));

    const response = await request(app)
      .post('/api/v1/auth/social')
      .send({
        provider: 'google',
        idToken: 'bad-token'
      });

    expect(response.statusCode).toBe(401);
    expectExactKeys(response.body, ['success', 'error']);
    expect(response.body.success).toBe(false);
    expectExactKeys(response.body.error, ['statusCode', 'message', 'requestId']);
    expect(response.body.error.statusCode).toBe(401);
    expect(response.body.error.message).toBe('Invalid Google id token.');
  });
});
