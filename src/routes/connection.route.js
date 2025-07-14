const express = require("express");
const router = express.Router();
const { getConnectionStatus, isTimerActive, isTimerPaused, canResumeTimer } = require("../wsClient");

// Get connection status
router.get("/status", (req, res) => {
    const status = getConnectionStatus();
    res.json(status);
});

// Get unregistered devices
router.get("/unregistered", (req, res) => {
    res.json({
        message: "Unregistered devices",
        data: []
    });
});

// Get disconnected devices
router.get("/disconnected", (req, res) => {
    res.json({
        message: "Disconnected devices",
        data: []
    });
});

// Get detailed timer status
router.get("/timer-status", (req, res) => {
    const status = getConnectionStatus();
    
    // Tambahkan informasi detail untuk setiap device
    const detailedDevices = status.devices.map(device => {
        return {
            ...device,
            isTimerActive: isTimerActive(device.deviceId),
            isTimerPaused: isTimerPaused(device.deviceId),
            canResume: canResumeTimer(device.deviceId)
        };
    });
    
    res.json({
        message: "Detailed timer status",
        data: {
            totalClients: status.totalClients,
            registeredDevices: status.registeredDevices,
            devices: detailedDevices
        }
    });
});

module.exports = router;