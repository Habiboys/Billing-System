const wsClient = require('../wsClient');

const getConnectionStatus = (req, res) => {
    try {
        const status = wsClient.getConnectionStatus();
        res.status(200).json(status);
    } catch (error) {
        console.error('Error getting connection status:', error);
        res.status(500).json({ message: 'Failed to get connection status', error: error.message });
    }
};

module.exports = {
    getConnectionStatus,
};