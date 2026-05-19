'use strict';

const {
  validateSignupPayload,
  validateLoginPayload,
  validateRefreshPayload
} = require('../src/validation/authValidators');

describe('authValidators.validateSignupPayload', () => {
  it('returns valid result for correct input', () => {
    const result = validateSignupPayload({ email: 'user@example.com', password: 'password123' });
    expect(result.valid).toBe(true);
    expect(result.value.email).toBe('user@example.com');
    expect(result.value.password).toBe('password123');
  });

  it('lowercases and trims email', () => {
    const result = validateSignupPayload({ email: '  User@EXAMPLE.COM  ', password: 'password123' });
    expect(result.valid).toBe(true);
    expect(result.value.email).toBe('user@example.com');
  });

  it('fails when email is missing', () => {
    const result = validateSignupPayload({ password: 'password123' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('email is required.');
  });

  it('fails when email is invalid format', () => {
    const result = validateSignupPayload({ email: 'not-an-email', password: 'password123' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('email must be valid.');
  });

  it('fails when password is missing', () => {
    const result = validateSignupPayload({ email: 'user@example.com' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('password is required.');
  });

  it('fails when password is too short (< 8 chars)', () => {
    const result = validateSignupPayload({ email: 'user@example.com', password: 'abc' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('password must be at least 8 characters.');
  });

  it('fails when password is too long (> 128 chars)', () => {
    const result = validateSignupPayload({ email: 'user@example.com', password: 'a'.repeat(129) });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('password must be at most 128 characters.');
  });

  it('accepts passwords exactly 8 characters', () => {
    const result = validateSignupPayload({ email: 'user@example.com', password: '12345678' });
    expect(result.valid).toBe(true);
  });

  it('accepts passwords exactly 128 characters', () => {
    const result = validateSignupPayload({ email: 'user@example.com', password: 'a'.repeat(128) });
    expect(result.valid).toBe(true);
  });

  it('returns multiple errors when both fields invalid', () => {
    const result = validateSignupPayload({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it('handles null payload gracefully', () => {
    const result = validateSignupPayload(null);
    expect(result.valid).toBe(false);
  });
});

describe('authValidators.validateLoginPayload', () => {
  it('behaves identically to validateSignupPayload', () => {
    const valid = validateLoginPayload({ email: 'a@b.com', password: 'password123' });
    expect(valid.valid).toBe(true);

    const invalid = validateLoginPayload({ email: 'bad' });
    expect(invalid.valid).toBe(false);
  });
});

describe('authValidators.validateRefreshPayload', () => {
  it('returns valid result when refreshToken is present', () => {
    const result = validateRefreshPayload({ refreshToken: 'some.jwt.token' });
    expect(result.valid).toBe(true);
    expect(result.value.refreshToken).toBe('some.jwt.token');
  });

  it('fails when refreshToken is missing', () => {
    const result = validateRefreshPayload({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('refreshToken is required.');
  });

  it('fails when refreshToken is empty string', () => {
    const result = validateRefreshPayload({ refreshToken: '   ' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('refreshToken is required.');
  });

  it('handles null payload gracefully', () => {
    const result = validateRefreshPayload(null);
    expect(result.valid).toBe(false);
  });
});
