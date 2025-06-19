const { getConnectionStatus, isTimerActive } = require('../wsClient');
const { Device, Transaction, Category } = require('../models');

const dashboard = async (req, res) => {
    try {
        // Mendapatkan status koneksi dari semua perangkat
        const connectionStatus = getConnectionStatus();
        
        // Mendapatkan data device dari database
        const devices = await Device.findAll({
            include: [
                {
                    model: Transaction,
                    limit: 1,
                    order: [['createdAt', 'DESC']]
                },
                {
                    model: Category
                }
            ]
        });
        
        // Menghitung total device yang aktif dan tidak aktif
        const activeDevices = connectionStatus.devices.filter(device => device.status === 'on');
        const inactiveDevices = connectionStatus.devices.filter(device => device.status === 'off');
        
        // Mengambil detail device yang aktif dengan data dari database
        const activeDevicesDetail = await Promise.all(
            activeDevices.map(async (device) => {
                const deviceData = devices.find(d => d.id === device.device_id);
                const lastTransaction = deviceData?.Transactions?.[0];
                
                return {
                    device_id: deviceData?.id,
                    name: deviceData?.name,
                    category: deviceData?.Category?.name,
                    status: device.status,
                    timer_start: deviceData?.timerStart,
                    timer_duration: deviceData?.timerDuration,
                    timer_elapsed: deviceData?.timerElapsed,
                    timer_status: deviceData?.timerStatus,
                    last_paused_at: deviceData?.lastPausedAt
                };
            })
        );

        // Mengambil data last used devices
        const lastUsedDevices = await Device.findAll({
            include: [
                {
                    model: Transaction,
                    limit: 1,
                    order: [['start', 'DESC']]
                },
                {
                    model: Category
                }
            ],
            limit: 5,
            order: [[Transaction, 'start', 'DESC']]
        });

        const lastUsedDevicesDetail = lastUsedDevices.map(device => ({
            device_id: device.id,
            name: device.name,
            category: device.Category?.name,
            last_used: {
                start_time: device.Transactions[0]?.start,
                end_time: device.Transactions[0]?.end,
                duration: device.Transactions[0]?.duration,
                cost: device.Transactions[0]?.cost
            }
        }));
        
        // Menyiapkan data untuk response
        const response = {
            summary: {
                total_active: activeDevices.length,
                total_inactive: inactiveDevices.length
            },
            active_devices: activeDevicesDetail,
            last_used_devices: lastUsedDevicesDetail
        };
        
        res.status(200).json(response);
    } catch (error) {
        console.error('Error in dashboard controller:', error);
        res.status(500).json({ message: error.message });
    }
}

module.exports = { dashboard };