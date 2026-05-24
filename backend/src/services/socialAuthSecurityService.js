const crypto = require('crypto');
const SocialAuthNonce = require('../models/SocialAuthNonce');
const { AppError } = require('../middleware/errorHandler');

const NONCE_TTL_MS = Number(process.env.SOCIAL_AUTH_NONCE_TTL_MS) || 10 * 60 * 1000;

function hashNonce(nonce) {
  return crypto.createHash('sha256').update(String(nonce)).digest('hex');
}

async function enforceSingleUseNonce(provider, nonce, providerSub) {
  if (String(provider || '').toLowerCase() !== 'apple') {
    return;
  }

  const nonceValue = String(nonce || '').trim();
  if (!nonceValue) {
    return;
  }

  try {
    await SocialAuthNonce.create({
      provider: 'apple',
      nonceHash: hashNonce(nonceValue),
      providerSub: providerSub ? String(providerSub) : null,
      expiresAt: new Date(Date.now() + NONCE_TTL_MS)
    });
  } catch (error) {
    if (error && error.code === 11000) {
      throw new AppError(401, 'Apple login nonce has already been used.');
    }

    throw error;
  }
}

module.exports = {
  enforceSingleUseNonce
};