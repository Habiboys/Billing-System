const express = require('express');
const router = express.Router();
const{ createDevice, getAllDevices, getDeviceById, updateDevice, deleteDevice} = require('../controllers/device.controller');
const{ tokenValidation, verifyAdmin} = require('../middlewares/auth.middleware');

router.post('/create', tokenValidation, verifyAdmin, createDevice);
router.get('/', tokenValidation, verifyAdmin, getAllDevices);
router.get('/:id', tokenValidation, verifyAdmin, getDeviceById);
router.put('/update/:id', tokenValidation, verifyAdmin, updateDevice);
router.delete('/delete/:id', tokenValidation, verifyAdmin, deleteDevice);
module.exports = router;