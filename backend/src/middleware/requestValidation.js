const { AppError } = require('./errorHandler');

function validateRequest(source, validator) {
  return (req, res, next) => {
    const payload = req[source];
    const result = validator(payload);

    if (!result.valid) {
      return next(new AppError(400, 'Validation failed.', result.errors));
    }

    req.validated = req.validated || {};
    req.validated[source] = result.value;
    return next();
  };
}

module.exports = {
  validateRequest
};
