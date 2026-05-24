const express = require('express');
const { validateRequest } = require('../middleware/requestValidation');
const {
  validateSignupPayload,
  validateLoginPayload,
  validateRefreshPayload,
  validateSocialLoginPayload
} = require('../validation/authValidators');
const {
  signup,
  login,
  refresh,
  logout,
  socialLogin
} = require('../controllers/authController');

const router = express.Router();

router.post('/signup', validateRequest('body', validateSignupPayload), signup);
router.post('/login', validateRequest('body', validateLoginPayload), login);
router.post('/refresh', validateRequest('body', validateRefreshPayload), refresh);
router.post('/logout', validateRequest('body', validateRefreshPayload), logout);
router.post('/social', validateRequest('body', validateSocialLoginPayload), socialLogin);

module.exports = router;
