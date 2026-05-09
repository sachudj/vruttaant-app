const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const { normalizeToTaxonomy } = require('../constants/categories');

async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId, { passwordHash: 0 }).lean();

    if (!user) {
      throw new AppError(404, 'User not found.');
    }

    return res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully.',
      profile: {
        id: user._id,
        email: user.email,
        role: user.role,
        preferences: user.preferences || { language: 'en', categories: [] }
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { preferences } = req.validated?.body || req.body;

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(404, 'User not found.');
    }

    if (preferences) {
      if (preferences.language !== undefined) {
        user.preferences.language = String(preferences.language).trim().toLowerCase();
      }
      
      if (preferences.categories !== undefined) {
        const uniqueCategories = new Set();
        for (const cat of preferences.categories) {
          const normalized = normalizeToTaxonomy(cat);
          if (normalized) {
            uniqueCategories.add(normalized);
          }
        }
        user.preferences.categories = Array.from(uniqueCategories);
      }
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      profile: {
        id: user._id,
        email: user.email,
        role: user.role,
        preferences: user.preferences
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile
};