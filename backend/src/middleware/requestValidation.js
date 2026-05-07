function validateRequest(source, validator) {
  return (req, res, next) => {
    const payload = req[source];
    const result = validator(payload);

    if (!result.valid) {
      return res.status(400).json({
        message: 'Validation failed.',
        errors: result.errors
      });
    }

    req.validated = req.validated || {};
    req.validated[source] = result.value;
    return next();
  };
}

module.exports = {
  validateRequest
};
