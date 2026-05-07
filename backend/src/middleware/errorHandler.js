class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

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

  if (process.env.NODE_ENV !== 'production' && error?.stack) {
    payload.error.stack = error.stack;
  }

  return res.status(statusCode).json(payload);
}

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler
};
