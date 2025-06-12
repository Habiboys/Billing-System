const express = require('express');
const router = express.Router();
const{ 
    createDevice, 
    getAllDevices, 
    getDeviceById, 
    updateDevice, 
    deleteDevice,
    sendDeviceCommand,
} = require('../controllers/device.controller');

const{ tokenValidation, verifyAdmin} = require('../middlewares/auth.middleware');

// Basic CRUD routes
router.post('/create', tokenValidation, createDevice);
router.get('/', tokenValidation, getAllDevices);
router.get('/:id', tokenValidation, getDeviceById);
router.put('/update/:id', tokenValidation,  updateDevice);
router.delete('/delete/:id', tokenValidation, deleteDevice);

// Command routes
router.post('/:id/command', tokenValidation, sendDeviceCommand);



module.exports = router;