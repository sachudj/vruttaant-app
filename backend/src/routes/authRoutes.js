const express = require('express');
const { validateRequest } = require('../middleware/requestValidation');
const {
  validateSignupPayload,
  validateLoginPayload,
  validateRefreshPayload
} = require('../validation/authValidators');
const {
  signup,
  login,
  refresh,
  logout
} = require('../controllers/authController');

const router = express.Router();

router.post('/signup', validateRequest('body', validateSignupPayload), signup);
router.post('/login', validateRequest('body', validateLoginPayload), login);
router.post('/refresh', validateRequest('body', validateRefreshPayload), refresh);
router.post('/logout', validateRequest('body', validateRefreshPayload), logout);

module.exports = router;
