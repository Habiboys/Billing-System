const { getConnectionStatus, isTimerActive, isUserOnline } = require('../wsClient');
const { Device, Transaction, Category, User, sequelize } = require('../models');
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
                const deviceData = devices.find(d => d.id === device.deviceId);
                
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

const adminDashboard = async (req, res) => {
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
        
        // Menghitung status perangkat
        const activeDevices = connectionStatus.devices.filter(device => device.status === 'on');
        const readyDevices = connectionStatus.devices.filter(device => device.status === 'off');
        const totalDevices = devices.length;
        
        // Data profil admin dari user yang sedang login
        const adminProfile = {
            name: req.user.email.split('@')[0], // Username dari email
            email: req.user.email,
            status: isUserOnline(req.user.id) ? "Online" : "Offline",
            profile_picture: null // Tidak ada profile picture dari database
        };
        
        // Menghitung total pemasukan mingguan
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Senin
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6); // Minggu
        endOfWeek.setHours(23, 59, 59, 999);
        
        const weeklyTransactions = await Transaction.findAll({
            where: {
                createdAt: {
                    [Op.between]: [startOfWeek, endOfWeek]
                }
            },
            include: [{
                model: Device,
                include: [{
                    model: Category,
                    attributes: ['categoryName', 'cost', 'satuanWaktu']
                }]
            }]
        });
        
        // Menghitung pemasukan per hari
        const dailyIncome = {};
        const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
        
        daysOfWeek.forEach(day => {
            dailyIncome[day] = 0;
        });
        
        weeklyTransactions.forEach(transaction => {
            const dayIndex = transaction.createdAt.getDay();
            const dayName = daysOfWeek[dayIndex === 0 ? 6 : dayIndex - 1]; // Convert Sunday=0 to Sunday=6
            dailyIncome[dayName] += transaction.cost || 0;
        });
        
        // Format data pemasukan mingguan
        const weeklyIncomeData = daysOfWeek.map(day => ({
            day: day,
            income: dailyIncome[day]
        }));
        
        // Total pemasukan mingguan
        const totalWeeklyIncome = Object.values(dailyIncome).reduce((sum, income) => sum + income, 0);
        
        // Mendapatkan daftar user terdaftar (5 user teratas)
        const registeredUsers = await User.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'email', 'type', 'isActive', 'createdAt']
        });
        
        // Format data user untuk response
        const usersList = registeredUsers.map((user) => ({
            id: user.id,
            name: user.email.split('@')[0], // Menggunakan username dari email
            email: user.email,
            status: isUserOnline(user.id) ? "Online" : "Offline",
            profile_picture: null // Tidak ada profile picture dari database
        }));
        
        // Menyiapkan data untuk response
        const response = {
            admin_profile: adminProfile,
            device_status: {
                running: {
                    text: "Perangkat sedang berjalan",
                    value: `${activeDevices.length}/${totalDevices}`
                },
                ready: {
                    text: "Perangkat siap digunakan", 
                    value: `${readyDevices.length}/${totalDevices}`
                }
            },
            total_income: {
                title: "Total pemasukan",
                timeframe: "Minggu ini",
                total: totalWeeklyIncome,
                chart_data: weeklyIncomeData
            },
            registered_users: {
                title: "User yang terdaftar",
                users: usersList,
                total_count: await User.count()
            }
        };
        
        res.status(200).json(response);
    } catch (error) {
        console.error('Error in admin dashboard controller:', error);
        res.status(500).json({ message: error.message });
    }
}

module.exports = { dashboard, adminDashboard };