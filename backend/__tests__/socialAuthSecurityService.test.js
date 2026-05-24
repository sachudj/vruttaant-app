'use strict';

jest.mock('../src/models/SocialAuthNonce');

const SocialAuthNonce = require('../src/models/SocialAuthNonce');
const { enforceSingleUseNonce } = require('../src/services/socialAuthSecurityService');

describe('socialAuthSecurityService.enforceSingleUseNonce', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SocialAuthNonce.create.mockResolvedValue({});
  });

  it('does nothing for non-apple providers', async () => {
    await enforceSingleUseNonce('google', 'nonce-1', 'sub-1');
    expect(SocialAuthNonce.create).not.toHaveBeenCalled();
  });

  it('does nothing when nonce is empty', async () => {
    await enforceSingleUseNonce('apple', '   ', 'sub-1');
    expect(SocialAuthNonce.create).not.toHaveBeenCalled();
  });

  it('stores hashed nonce for apple', async () => {
    await enforceSingleUseNonce('apple', 'nonce-1', 'sub-1');

    expect(SocialAuthNonce.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'apple',
        providerSub: 'sub-1',
        nonceHash: expect.any(String),
        expiresAt: expect.any(Date)
      })
    );

    expect(SocialAuthNonce.create.mock.calls[0][0].nonceHash).not.toBe('nonce-1');
  });

  it('maps duplicate key errors to AppError 401', async () => {
    SocialAuthNonce.create.mockRejectedValue({ code: 11000 });

    await expect(enforceSingleUseNonce('apple', 'nonce-1', 'sub-1')).rejects.toEqual(
      expect.objectContaining({ statusCode: 401 })
    );
  });

  it('rethrows non-duplicate persistence errors', async () => {
    const dbError = new Error('db failure');
    SocialAuthNonce.create.mockRejectedValue(dbError);

    await expect(enforceSingleUseNonce('apple', 'nonce-1', 'sub-1')).rejects.toBe(dbError);
  });
});
