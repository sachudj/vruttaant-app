const express = require('express');
const { getProfile, updateProfile } = require('../controllers/userController');
const { validateProfileUpdate } = require('../validation/userValidators');
const { verifyAccessToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verifyAccessToken);

router.get('/profile', getProfile);
router.patch('/profile', validateProfileUpdate, updateProfile);

module.exports = router;