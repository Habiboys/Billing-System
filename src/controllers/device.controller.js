const{ Device, User, Category } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { getConnectionStatus, isTimerActive } = require('../wsClient');

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

// Mendapatkan semua device yang terkoneksi ke WebSocket
const getAllConnectedDevices = async (req, res) => {
    try {
        const status = getConnectionStatus();
        return res.status(200).json(status);
    } catch (error) {
        console.error('Get connected devices error:', error);
        return res.status(500).json({
            message: error.message
        });
    }
};

// Mendapatkan device yang terkoneksi tapi belum terdaftar di database
const getUnregisteredDevices = async (req, res) => {
    try {
        // Ambil status koneksi
        const status = getConnectionStatus();
        
        // Ambil device yang sudah terdaftar di database
        const registeredDevices = await Device.findAll({
            attributes: ['id']
        });
        
        const registeredDeviceIds = registeredDevices.map(device => device.id);
        
        // Filter hanya device yang belum terdaftar
        const unregisteredDevices = status.devices.filter(device => {
            const deviceId = device.device_id || device.deviceId;
            return !registeredDeviceIds.includes(deviceId);
        });
        
        // Kembalikan format yang sama dengan getConnectionStatus
        return res.status(200).json({
            totalClients: status.totalClients,
            registeredDevices: unregisteredDevices.length,
            devices: unregisteredDevices
        });
    } catch (error) {
        console.error('Get unregistered devices error:', error);
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
    getAllConnectedDevices,
    getUnregisteredDevices
}