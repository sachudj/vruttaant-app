'use strict';

jest.mock('jsonwebtoken');

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const {
  fetchGoogleIdentity,
  fetchAppleIdentity,
  verifySocialIdentity
} = require('../src/services/socialAuthService');

function makeTokenWithKid(kid) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: 'payload' })).toString('base64url');
  return `${header}.${payload}.sig`;
}

describe('socialAuthService.fetchGoogleIdentity', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'google-client-id';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns normalized identity for valid google token payload', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        aud: 'google-client-id',
        iss: 'https://accounts.google.com',
        exp: String(Math.floor(Date.now() / 1000) + 3600),
        sub: 'google-sub-1',
        email: 'Reader@Example.com',
        email_verified: 'true',
        name: 'Reader One'
      })
    });

    const identity = await fetchGoogleIdentity('google-id-token');

    expect(identity).toEqual({
      provider: 'google',
      providerSub: 'google-sub-1',
      email: 'reader@example.com',
      emailVerified: true,
      displayName: 'Reader One'
    });
  });

  it('rejects audience mismatch', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        aud: 'different-client-id',
        iss: 'https://accounts.google.com',
        exp: String(Math.floor(Date.now() / 1000) + 3600),
        sub: 'google-sub-1',
        email: 'reader@example.com',
        email_verified: 'true'
      })
    });

    await expect(fetchGoogleIdentity('google-id-token')).rejects.toEqual(
      expect.objectContaining({ statusCode: 401, message: 'Google token audience mismatch.' })
    );
  });

  it('rejects expired token', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        aud: 'google-client-id',
        iss: 'https://accounts.google.com',
        exp: String(Math.floor(Date.now() / 1000) - 1),
        sub: 'google-sub-1',
        email: 'reader@example.com',
        email_verified: 'true'
      })
    });

    await expect(fetchGoogleIdentity('google-id-token')).rejects.toEqual(
      expect.objectContaining({ statusCode: 401, message: 'Google id token has expired.' })
    );
  });
});

describe('socialAuthService.fetchAppleIdentity', () => {
  const originalFetch = global.fetch;
  let createPublicKeySpy;

  beforeEach(() => {
    process.env.APPLE_SERVICE_ID = 'com.vruttaant.app';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        keys: [{ kid: 'kid-1', kty: 'RSA', n: 'n', e: 'AQAB' }]
      })
    });
    createPublicKeySpy = jest.spyOn(crypto, 'createPublicKey').mockReturnValue('mock-public-key');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    createPublicKeySpy.mockRestore();
  });

  it('accepts raw nonce match', async () => {
    jwt.verify.mockReturnValue({
      sub: 'apple-sub-1',
      email: 'apple@example.com',
      email_verified: true,
      nonce: 'nonce-value'
    });

    const identity = await fetchAppleIdentity(makeTokenWithKid('kid-1'), 'nonce-value');

    expect(identity).toEqual({
      provider: 'apple',
      providerSub: 'apple-sub-1',
      email: 'apple@example.com',
      emailVerified: true,
      displayName: null
    });
  });

  it('accepts sha256 hashed nonce match', async () => {
    const nonce = 'nonce-value';
    const hashedNonce = crypto.createHash('sha256').update(nonce).digest('hex');

    jwt.verify.mockReturnValue({
      sub: 'apple-sub-1',
      email: 'apple@example.com',
      email_verified: 'true',
      nonce: hashedNonce
    });

    const identity = await fetchAppleIdentity(makeTokenWithKid('kid-1'), nonce);
    expect(identity.providerSub).toBe('apple-sub-1');
  });

  it('rejects nonce mismatch', async () => {
    jwt.verify.mockReturnValue({
      sub: 'apple-sub-1',
      nonce: 'different-nonce'
    });

    await expect(fetchAppleIdentity(makeTokenWithKid('kid-1'), 'nonce-value')).rejects.toEqual(
      expect.objectContaining({ statusCode: 401, message: 'Apple token nonce mismatch.' })
    );
  });
});

describe('socialAuthService.verifySocialIdentity', () => {
  it('rejects unsupported provider', async () => {
    await expect(verifySocialIdentity('facebook', 'id-token', null)).rejects.toEqual(
      expect.objectContaining({ statusCode: 400, message: 'Unsupported social provider.' })
    );
  });
});