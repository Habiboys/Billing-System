const{ Device, User, Category } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { getConnectionStatus, isTimerActive, sendCommand } = require('../wsClient');

//create device
const createDevice = async (req, res) => {
    const {name, categoryId, id} = req.body;

    try{
        // Validasi input
        if (!id) {
            return res.status(400).json({
                message: 'Device ID harus diisi'
            });
        }

        if (!name || !categoryId) {
            return res.status(400).json({
                message: 'Name dan Category ID harus diisi'
            });
        }

        // Cek koneksi websocket terlebih dahulu
        const connectedDevices = getConnectionStatus();
        if (!connectedDevices.devices.includes(id)) {
            return res.status(400).json({
                message: 'Device belum terkoneksi ke server WebSocket'
            });
        }

        // Cek apakah device sudah terdaftar
        const existingDevice = await Device.findOne({
            where: {
                id: id
            }
        });

        if(existingDevice){
            return res.status(400).json({
                message: 'Device sudah terdaftar di database'
            });
        }

        // Buat device baru
        const device = await Device.create({
            id: id,
            name,
            categoryId
        });

        return res.status(201).json({
            message: 'Device berhasil didaftarkan',
            data: device
        });
    } catch(error) {
        return res.status(500).json({
            message: error.message
        });
    }
}

const getAllDevices = async (req, res) => {
    try {
        // Ambil semua device dari database
        const devices = await Device.findAll({
            include: [
                {
                    model: Category,
                    as: 'category'
                }
            ]
        });

        // Ambil status koneksi
        const connectedStatus = getConnectionStatus();
        const connectedDevices = new Map(
            connectedStatus.devices.map(device => [device.deviceId, device])
        );

        // Gabungkan data database dengan status koneksi
        const devicesWithStatus = devices.map(device => {
            const deviceData = device.toJSON();
            const connectionInfo = connectedDevices.get(device.id);
            
            return {
                ...deviceData,
                isConnected: !!connectionInfo,
                status: connectionInfo ? connectionInfo.status : 'off'
            };
        });

        return res.status(200).json({
            message: 'Berhasil mendapatkan daftar device',
            data: devicesWithStatus
        });
    } catch (error) {
        console.error('Get all devices error:', error);
        return res.status(500).json({
            message: error.message
        });
    }
};

const getDeviceById = async (req, res) => {
    const { id } = req.params;
    try {
        const device = await Device.findOne({
            where: { id },
            include: [
                {
                    model: Category,
                    as: 'category'
                }
            ]
        });

        if (!device) {
            return res.status(404).json({
                message: 'Device tidak ditemukan'
            });
        }

        // Ambil status koneksi
        const connectedStatus = getConnectionStatus();
        const connectionInfo = connectedStatus.devices.find(d => d.deviceId === id);

        const deviceData = device.toJSON();
        const response = {
            ...deviceData,
            isConnected: !!connectionInfo,
            status: connectionInfo ? connectionInfo.status : 'off'
        };

        return res.status(200).json({
            message: 'Device ditemukan',
            data: response
        });
    } catch (error) {
        console.error('Get device by id error:', error);
        return res.status(500).json({
            message: error.message
        });
    }
};

const updateDevice = async (req, res) => {
    const {id} = req.params;
    const {name, categoryId} = req.body;
    try{
        const device = await Device.findOne({
            where: {
                id
            }
        })
        if(!device){
            return res.status(404).json({
                message: 'Device not found'
            })
        }
        device.name = name;
        device.categoryId = categoryId;
        await device.save();
    }catch(error){
        return res.status(500).json({
            message: error.message
        })
    }
}

const deleteDevice = async (req, res) => {
    const {id} = req.params;
    try{
        const device = await Device.findOne({
            where: {
                id
            }
        })
        if(!device){
            return res.status(404).json({
                message: 'Device not found'
            })
        }
        await device.destroy();
        return res.status(200).json({
            message: 'Device deleted'
        })
    }catch(error){
        return res.status(500).json({
            message: error.message
        })
    }
}

const sendDeviceCommand = async (req, res) => {
    const { id } = req.params;
    const { command } = req.body;

    try {
        // Validasi device exists di database
        const device = await Device.findOne({
            where: { id }
        });

        if (!device) {
            return res.status(404).json({
                message: 'Device tidak ditemukan'
            });
        }

        const now = new Date();

        // Handle timer status berdasarkan command
        if (command === 'start') {
            if (device.timerStatus === 'stop') {
                // Jika timer di-pause, hitung elapsed time
                if (device.lastPausedAt) {
                    const pauseDuration = now - device.lastPausedAt;
                    // Update timer start dengan menambahkan durasi pause
                    await device.update({
                        timerStart: new Date(device.timerStart.getTime() + pauseDuration),
                        timerStatus: 'start',
                        lastPausedAt: null
                    });
                }
            } else {
                // Timer baru dimulai
                await device.update({
                    timerStart: now,
                    timerStatus: 'start',
                    timerElapsed: 0,
                    lastPausedAt: null
                });
            }
        } else if (command === 'stop') {
            if (device.timerStatus === 'start') {
                // Hitung elapsed time saat ini dalam detik
                const elapsedTime = Math.floor((now - device.timerStart) / 1000);
                await device.update({
                    timerStatus: 'stop',
                    timerElapsed: device.timerElapsed + elapsedTime,
                    lastPausedAt: now
                });
            }
        } else if (command === 'end') {
            // Reset semua status timer
            await device.update({
                timerStatus: 'end',
                timerElapsed: 0,
                timerStart: null,
                lastPausedAt: null,
                timerDuration: 0
            });
        }

        // Kirim command ke device
        const result = await sendCommand({
            deviceId: id,
            command
        });

        if (!result.success) {
            return res.status(400).json({
                message: result.message
            });
        }

        // Get updated device data
        const updatedDevice = await Device.findByPk(id);

        return res.status(200).json({
            message: `Berhasil mengirim perintah ${command} ke device`,
            data: {
                command: result.data,
                device: {
                    id: updatedDevice.id,
                    timerStatus: updatedDevice.timerStatus,
                    timerStart: updatedDevice.timerStart,
                    timerDuration: updatedDevice.timerDuration,
                    timerElapsed: updatedDevice.timerElapsed,
                    lastPausedAt: updatedDevice.lastPausedAt
                }
            }
        });

    } catch (error) {
        console.error('Send command error:', error);
        return res.status(500).json({
            message: error.message
        });
    }
};

module.exports = {
    createDevice,
    getAllDevices,
    getDeviceById,
    updateDevice,
    deleteDevice,
    sendDeviceCommand
}