const { getConnectionStatus, isTimerActive } = require('../wsClient');
const { Device, Transaction, Category } = require('../models');
const { Op } = require('sequelize');

const dashboard = async (req, res) => {
    try {
        // Mendapatkan status koneksi dari semua perangkat
        const connectionStatus = getConnectionStatus();
        
        // Mendapatkan data device dari database
        const devices = await Device.findAll({
            include: [{
                model: Category,
                attributes: ['categoryName', 'cost', 'satuanWaktu']
            }]
        });
        
        // Menghitung total device yang aktif dan tidak aktif
        const activeDevices = connectionStatus.devices.filter(device => device.status === 'on');
        const inactiveDevices = connectionStatus.devices.filter(device => device.status === 'off');
        
        // Mengambil detail device yang aktif dengan data dari database
        const activeDevicesDetail = await Promise.all(
            activeDevices.map(async (device) => {
                const deviceData = devices.find(d => d.id === device.device_id);
                
                return {
                    device_id: deviceData?.id,
                    name: deviceData?.name,
                    category: deviceData?.Category?.categoryName,
                    category_cost: deviceData?.Category?.cost,
                    satuan_waktu: deviceData?.Category?.satuanWaktu,
                    status: device.status,
                    timer_start: deviceData?.timerStart,
                    timer_duration: deviceData?.timerDuration,
                    timer_elapsed: deviceData?.timerElapsed,
                    timer_status: deviceData?.timerStatus,
                    last_paused_at: deviceData?.lastPausedAt
                };
            })
        );

        // Mengambil data last used devices dengan transaksi terakhir
        const lastUsedDevices = await Device.findAll({
            include: [
                {
                    model: Category,
                    attributes: ['categoryName', 'cost', 'satuanWaktu']
                },
                {
                    model: Transaction,
                    separate: true,
                    limit: 1,
                    order: [['createdAt', 'DESC']]
                }
            ],
            limit: 5,
            order: [[Transaction, 'createdAt', 'DESC']]
        });

        const lastUsedDevicesDetail = lastUsedDevices.map(device => ({
            device_id: device.id,
            name: device.name,
            category: device.Category?.categoryName,
            category_cost: device.Category?.cost,
            satuan_waktu: device.Category?.satuanWaktu,
            last_used: {
                start: device.Transactions?.[0]?.start,
                end: device.Transactions?.[0]?.end,
                duration: device.Transactions?.[0]?.duration,
                cost: device.Transactions?.[0]?.cost
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