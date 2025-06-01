const express = require('express');
const router = express.Router();
const connectionController = require('../controllers/connectionController');

router.get('/status', connectionController.getConnectionStatus);

module.exports = router;