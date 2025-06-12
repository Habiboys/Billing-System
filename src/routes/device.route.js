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
router.post('/create', tokenValidation, createDevice);
router.get('/', tokenValidation, getAllDevices);
router.get('/:id', tokenValidation, getDeviceById);
router.put('/update/:id', tokenValidation,  updateDevice);
router.delete('/delete/:id', tokenValidation, deleteDevice);

// WebSocket device routes
router.get('/connected',  getAllConnectedDevices);
router.get('/unregistered',  getUnregisteredDevices);

module.exports = router;