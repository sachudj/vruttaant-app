const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { AppError } = require('../middleware/errorHandler');

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const REFRESH_TOKEN_TTL_MS = Number(process.env.REFRESH_TOKEN_TTL_MS) || 7 * 24 * 60 * 60 * 1000;
const PASSWORD_SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS) || 12;

function resolveJwtSecret() {
  if (process.env.JWT_ACCESS_SECRET) {
    return process.env.JWT_ACCESS_SECRET;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new AppError(500, 'JWT_ACCESS_SECRET must be configured in production.');
  }

  return 'dev-access-secret-change-me';
}

function resolveJwtRefreshSecret() {
  if (process.env.JWT_REFRESH_SECRET) {
    return process.env.JWT_REFRESH_SECRET;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new AppError(500, 'JWT_REFRESH_SECRET must be configured in production.');
  }

  return 'dev-refresh-secret-change-me';
}

function buildAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      email: user.email
    },
    resolveJwtSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function buildAndStoreRefreshToken(userId) {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    {
      sub: String(userId),
      jti,
      type: 'refresh'
    },
    resolveJwtRefreshSecret(),
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

  await RefreshToken.create({
    userId,
    jti,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
  });

  return token;
}

function authResponse(user, accessToken, refreshToken) {
  return {
    success: true,
    data: {
      user: {
        id: String(user._id),
        email: user.email,
        role: user.role
      },
      tokens: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: ACCESS_TOKEN_EXPIRES_IN
      }
    }
  };
}

async function signup(req, res, next) {
  try {
    const { email, password } = req.validated.body;

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      throw new AppError(409, 'An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    const user = await User.create({ email, passwordHash, role: 'user' });

    const accessToken = buildAccessToken(user);
    const refreshToken = await buildAndStoreRefreshToken(user._id);

    res.status(201).json(authResponse(user, accessToken, refreshToken));
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.validated.body;
    const user = await User.findOne({ email });

    if (!user) {
      throw new AppError(401, 'Invalid email or password.');
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new AppError(401, 'Invalid email or password.');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = buildAccessToken(user);
    const refreshToken = await buildAndStoreRefreshToken(user._id);

    res.status(200).json(authResponse(user, accessToken, refreshToken));
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.validated.body;

    let payload;
    try {
      payload = jwt.verify(refreshToken, resolveJwtRefreshSecret());
    } catch {
      throw new AppError(401, 'Invalid refresh token.');
    }

    if (payload?.type !== 'refresh' || !payload?.sub || !payload?.jti) {
      throw new AppError(401, 'Invalid refresh token payload.');
    }

    const tokenHash = hashToken(refreshToken);
    const storedToken = await RefreshToken.findOne({
      tokenHash,
      jti: payload.jti,
      userId: payload.sub
    });

    if (!storedToken) {
      throw new AppError(401, 'Refresh token not recognized.');
    }

    if (storedToken.revokedAt || storedToken.expiresAt <= new Date()) {
      throw new AppError(401, 'Refresh token has expired or was revoked.');
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      throw new AppError(401, 'User not found for token.');
    }

    const newRefreshToken = await buildAndStoreRefreshToken(user._id);
    const newPayload = jwt.decode(newRefreshToken);

    storedToken.revokedAt = new Date();
    storedToken.replacedByJti = newPayload?.jti || null;
    await storedToken.save();

    const accessToken = buildAccessToken(user);

    res.status(200).json(authResponse(user, accessToken, newRefreshToken));
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.validated.body;
    const tokenHash = hashToken(refreshToken);

    await RefreshToken.updateOne(
      { tokenHash, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      data: {
        message: 'Logged out successfully.'
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  signup,
  login,
  refresh,
  logout
};
