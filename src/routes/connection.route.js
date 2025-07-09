const express = require('express');
const router = express.Router();
const connectionController = require('../controllers/connection.controller');

router.get('/status', connectionController.getConnectionStatus);
router.get('/unregistered', connectionController.getUnregisteredDevices);
router.get('/disconnected', connectionController.getDisconnectedDevices);
router.get('/mobile/notifications', connectionController.getMobileNotifications);

module.exports = router;