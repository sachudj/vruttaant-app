const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { AppError } = require('../middleware/errorHandler');

const GOOGLE_TOKENINFO_ENDPOINT = 'https://oauth2.googleapis.com/tokeninfo';
const APPLE_KEYS_ENDPOINT = 'https://appleid.apple.com/auth/keys';

const appleKeysCache = {
  fetchedAt: 0,
  keys: []
};

const APPLE_KEYS_CACHE_TTL_MS = 60 * 60 * 1000;

function decodeJwtSection(section) {
  try {
    return JSON.parse(Buffer.from(section, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function decodeJwtHeader(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) {
    return null;
  }
  return decodeJwtSection(parts[0]);
}

async function fetchGoogleIdentity(idToken) {
  const audience = String(process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim();
  if (!audience) {
    throw new AppError(500, 'GOOGLE_OAUTH_CLIENT_ID is not configured.');
  }

  const url = `${GOOGLE_TOKENINFO_ENDPOINT}?id_token=${encodeURIComponent(idToken)}`;

  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new AppError(502, 'Unable to reach Google token verification endpoint.');
  }

  if (!response.ok) {
    throw new AppError(401, 'Invalid Google id token.');
  }

  const payload = await response.json();

  if (payload.aud !== audience) {
    throw new AppError(401, 'Google token audience mismatch.');
  }

  if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
    throw new AppError(401, 'Google token issuer mismatch.');
  }

  const expiresAt = Number(payload.exp || 0) * 1000;
  if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) {
    throw new AppError(401, 'Google id token has expired.');
  }

  const sub = String(payload.sub || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const emailVerified = String(payload.email_verified || '').toLowerCase() === 'true';

  if (!sub || !email) {
    throw new AppError(401, 'Google id token payload is incomplete.');
  }

  return {
    provider: 'google',
    providerSub: sub,
    email,
    emailVerified,
    displayName: String(payload.name || '').trim() || null
  };
}

async function getAppleKeys() {
  if (
    appleKeysCache.keys.length > 0
    && Date.now() - appleKeysCache.fetchedAt < APPLE_KEYS_CACHE_TTL_MS
  ) {
    return appleKeysCache.keys;
  }

  let response;
  try {
    response = await fetch(APPLE_KEYS_ENDPOINT);
  } catch {
    throw new AppError(502, 'Unable to reach Apple key endpoint.');
  }

  if (!response.ok) {
    throw new AppError(502, 'Apple key endpoint request failed.');
  }

  const json = await response.json();
  const keys = Array.isArray(json.keys) ? json.keys : [];

  if (!keys.length) {
    throw new AppError(502, 'Apple key set is empty.');
  }

  appleKeysCache.keys = keys;
  appleKeysCache.fetchedAt = Date.now();

  return keys;
}

async function fetchAppleIdentity(idToken, nonce) {
  const audience = String(process.env.APPLE_SERVICE_ID || '').trim();
  if (!audience) {
    throw new AppError(500, 'APPLE_SERVICE_ID is not configured.');
  }

  const header = decodeJwtHeader(idToken);
  if (!header?.kid) {
    throw new AppError(401, 'Invalid Apple identity token header.');
  }

  const keys = await getAppleKeys();
  const jwk = keys.find((key) => key?.kid === header.kid && key?.kty === 'RSA');

  if (!jwk) {
    throw new AppError(401, 'Unable to find matching Apple signing key.');
  }

  let payload;
  try {
    const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    payload = jwt.verify(idToken, publicKey, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
      audience
    });
  } catch {
    throw new AppError(401, 'Invalid Apple identity token.');
  }

  const sub = String(payload?.sub || '').trim();
  const email = String(payload?.email || '').trim().toLowerCase();

  if (nonce) {
    const payloadNonce = String(payload?.nonce || '');
    const rawNonce = String(nonce);
    const hashedNonce = crypto.createHash('sha256').update(rawNonce).digest('hex');

    if (payloadNonce !== rawNonce && payloadNonce !== hashedNonce) {
      throw new AppError(401, 'Apple token nonce mismatch.');
    }
  }

  if (!sub) {
    throw new AppError(401, 'Apple identity token payload is incomplete.');
  }

  return {
    provider: 'apple',
    providerSub: sub,
    email: email || null,
    emailVerified: payload?.email_verified === true || payload?.email_verified === 'true',
    displayName: null
  };
}

async function verifySocialIdentity(provider, idToken, nonce) {
  const normalizedProvider = String(provider || '').trim().toLowerCase();

  if (normalizedProvider === 'google') {
    return fetchGoogleIdentity(idToken);
  }

  if (normalizedProvider === 'apple') {
    return fetchAppleIdentity(idToken, nonce);
  }

  throw new AppError(400, 'Unsupported social provider.');
}

module.exports = {
  verifySocialIdentity,
  fetchGoogleIdentity,
  fetchAppleIdentity
};
