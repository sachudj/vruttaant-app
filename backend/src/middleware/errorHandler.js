class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

const { captureError } = require('../observability/errorTracker');

function notFoundHandler(req, res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = Number(error?.statusCode) || 500;
  const message = statusCode >= 500 ? 'Internal server error.' : (error?.message || 'Request failed.');

  const payload = {
    success: false,
    error: {
      statusCode,
      message
    }
  };

  if (error?.details !== undefined) {
    payload.error.details = error.details;
  }

  if (req?.requestId) {
    payload.error.requestId = req.requestId;
  }

  if (process.env.NODE_ENV !== 'production' && error?.stack) {
    payload.error.stack = error.stack;
  }

  if (statusCode >= 500) {
    captureError(error, {
      requestId: req?.requestId,
      statusCode,
      method: req?.method,
      path: req?.originalUrl,
      userId: req?.user?.id
    });
  }

  return res.status(statusCode).json(payload);
}

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler
};
