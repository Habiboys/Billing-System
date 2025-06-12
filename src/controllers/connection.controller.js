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

const getUnregisteredDevices = async (req, res) => {
    try {
        const devices = await Device.findAll({
            where: {
                id: {
                    [Op.notIn]: wsClient.getConnectionStatus().devices.map(device => device.id)
                }
            }
        });
    } catch (error) {
        console.error('Error getting unregistered devices:', error);
        res.status(500).json({ message: 'Failed to get unregistered devices', error: error.message });
    }
};

module.exports = {
    getConnectionStatus,
    getUnregisteredDevices
};