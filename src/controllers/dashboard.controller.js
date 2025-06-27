const { getConnectionStatus, isTimerActive } = require('../wsClient');
const { Device, Transaction, Category, sequelize } = require('../models');
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

        // Mengambil 5 transaksi terakhir terlebih dahulu
        const lastTransactions = await Transaction.findAll({
            limit: 1,
            order: [['createdAt', 'DESC']],
            include: [{
                model: Device,
                include: [{
                    model: Category,
                    attributes: ['categoryName', 'cost', 'satuanWaktu']
                }]
            }]
        });

        // Format data last used devices
        const lastUsedDevicesDetail = lastTransactions.map(transaction => ({
            device_id: transaction.Device?.id,
            name: transaction.Device?.name,
            category: transaction.Device?.Category?.categoryName,
            category_cost: transaction.Device?.Category?.cost,
            satuan_waktu: transaction.Device?.Category?.satuanWaktu,
            last_used: {
                start: transaction.start,
                end: transaction.end,
                duration: transaction.duration,
                cost: transaction.cost // Ini adalah harga transaksi, bukan harga kategori
            }
        })).filter(device => device.device_id); // Filter out null devices
        
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