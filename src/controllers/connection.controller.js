const wsClient = require('../wsClient');
const { Device } = require('../models');
//import Op from sequelize
const { Op } = require('sequelize');

const getConnectionStatus = (req, res) => {
    try {
        const status = wsClient.getConnectionStatus();
        res.status(200).json(status);
    } catch (error) {
        console.error('Error getting connection status:', error);
        res.status(500).json({ message: 'Failed to get connection status', error: error.message });
    }
};

const getDisconnectedDevices = async (req, res) => {
    try {
        const connectedDevices = wsClient.getConnectionStatus().devices;
        const connectedIds = connectedDevices.map(device => device.device_id);

        const devices = await Device.findAll({
            where: {
                id: {
                    [Op.notIn]: connectedIds
                }
            }
        });

        res.status(200).json({
            message: 'Berhasil mendapatkan daftar device yang tidak terkoneksi',
            data: devices
        });
    } catch (error) {
        console.error('Error getting unregistered devices:', error);
        res.status(500).json({ message: 'Failed to get unregistered devices', error: error.message });
    }
};

// sudah terhubung ke socket tapi belum terdaftar di database
const getUnregisteredDevices = async (req, res) => {
    try {
        // Ambil semua device yang terkoneksi ke WebSocket
        const connectedDevices = wsClient.getConnectionStatus().devices;
        const connectedIds = connectedDevices.map(device => device.device_id);

        // Ambil semua device yang sudah terdaftar di database
        const registeredDevices = await Device.findAll();
        const registeredIds = registeredDevices.map(device => device.id);

        // Filter device yang terkoneksi tapi belum terdaftar
        const unregisteredDevices = connectedDevices.filter(device => 
            !registeredIds.includes(device.device_id)
        );

        res.status(200).json({
            message: 'Berhasil mendapatkan daftar device yang terkoneksi tapi belum terdaftar',
            data: unregisteredDevices
        });
    } catch (error) {
        console.error('Error getting unregistered devices:', error);
        res.status(500).json({ message: 'Failed to get unregistered devices', error: error.message });
    }
};

module.exports = {
    getConnectionStatus,
    getUnregisteredDevices,
    getDisconnectedDevices
};