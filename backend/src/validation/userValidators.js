const { normalizeToTaxonomy } = require('../constants/categories');
const { SUPPORTED_LANGUAGE_ALIASES } = require('../services/newsIngestionService');

function validateProfileUpdate(req, res, next) {
  const { preferences } = req.body;

  if (preferences !== undefined) {
    if (typeof preferences !== 'object' || preferences === null) {
      return res.status(400).json({
        success: false,
        error: {
          statusCode: 400,
          message: 'preferences must be an object',
          details: 'Invalid payload format'
        }
      });
    }

    if (preferences.language !== undefined) {
      if (typeof preferences.language !== 'string') {
        return res.status(400).json({
          success: false,
          error: {
            statusCode: 400,
            message: 'language must be a valid code',
            details: 'Invalid language preference'
          }
        });
      }
      const lang = preferences.language.trim().toLowerCase();
      if (lang.length < 2 || lang.length > 5) {
        return res.status(400).json({
          success: false,
          error: {
            statusCode: 400,
            message: 'language must be a valid code',
            details: 'Invalid language preference'
          }
        });
      }
    }

    if (preferences.categories !== undefined) {
      if (!Array.isArray(preferences.categories)) {
        return res.status(400).json({
          success: false,
          error: {
            statusCode: 400,
            message: 'categories must be an array',
            details: 'Invalid categories preference'
          }
        });
      }

      // Check if they are strings
      for (const cat of preferences.categories) {
        if (typeof cat !== 'string') {
          return res.status(400).json({
            success: false,
            error: {
              statusCode: 400,
              message: 'categories must contain only strings',
              details: 'Invalid category item'
            }
          });
        }
      }
    }
  }

  req.validated = {
    body: {
      preferences
    }
  };

  return next();
}

module.exports = {
  validateProfileUpdate
};