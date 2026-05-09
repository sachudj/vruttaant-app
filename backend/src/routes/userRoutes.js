const express = require('express');
const { getProfile, updateProfile } = require('../controllers/userController');
const {
	getNotificationPreferences,
	updateNotificationPreferences,
	registerNotificationDevice,
	listNotificationDevices,
	deleteNotificationDevice
} = require('../controllers/notificationController');
const { validateProfileUpdate } = require('../validation/userValidators');
const {
	validateNotificationPreferencesUpdate,
	validateRegisterNotificationDevice,
	validateNotificationDeviceId
} = require('../validation/notificationValidators');
const { verifyAccessToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verifyAccessToken);

router.get('/profile', getProfile);
router.patch('/profile', validateProfileUpdate, updateProfile);

router.get('/notifications/preferences', getNotificationPreferences);
router.patch(
	'/notifications/preferences',
	validateNotificationPreferencesUpdate,
	updateNotificationPreferences
);

router.post(
	'/notifications/devices',
	validateRegisterNotificationDevice,
	registerNotificationDevice
);
router.get('/notifications/devices', listNotificationDevices);
router.delete(
	'/notifications/devices/:deviceId',
	validateNotificationDeviceId,
	deleteNotificationDevice
);

module.exports = router;