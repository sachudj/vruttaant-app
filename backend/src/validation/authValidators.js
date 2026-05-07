function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateSignupPayload(payload) {
  const body = payload && typeof payload === 'object' ? payload : {};
  const errors = [];

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!email) {
    errors.push('email is required.');
  } else if (!isEmail(email)) {
    errors.push('email must be valid.');
  }

  if (!password) {
    errors.push('password is required.');
  } else if (password.length < 8) {
    errors.push('password must be at least 8 characters.');
  } else if (password.length > 128) {
    errors.push('password must be at most 128 characters.');
  }

  if (errors.length) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: {
      email,
      password
    }
  };
}

function validateLoginPayload(payload) {
  return validateSignupPayload(payload);
}

function validateRefreshPayload(payload) {
  const body = payload && typeof payload === 'object' ? payload : {};
  const errors = [];
  const refreshToken = String(body.refreshToken || '').trim();

  if (!refreshToken) {
    errors.push('refreshToken is required.');
  }

  if (errors.length) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: {
      refreshToken
    }
  };
}

module.exports = {
  validateSignupPayload,
  validateLoginPayload,
  validateRefreshPayload
};
