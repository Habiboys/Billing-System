const express = require('express');
const router = express.Router();
const{ 
    createDevice, 
    getAllDevices, 
    getDeviceById, 
    updateDevice, 
    deleteDevice,
    getAllConnectedDevices,
    getUnregisteredDevices
} = require('../controllers/device.controller');
const{ tokenValidation, verifyAdmin} = require('../middlewares/auth.middleware');

// Basic CRUD routes
router.post('/create', tokenValidation, verifyAdmin, createDevice);
router.get('/', tokenValidation, verifyAdmin, getAllDevices);
router.get('/:id', tokenValidation, verifyAdmin, getDeviceById);
router.put('/update/:id', tokenValidation, verifyAdmin, updateDevice);
router.delete('/delete/:id', tokenValidation, verifyAdmin, deleteDevice);

// WebSocket device routes
router.get('/connected', tokenValidation, verifyAdmin, getAllConnectedDevices);
router.get('/unregistered', tokenValidation, verifyAdmin, getUnregisteredDevices);

module.exports = router;