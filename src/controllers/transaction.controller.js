// transactionController.js
const { Transaction, Device } = require('../models');
const { sendToESP32, getConnectionStatus } = require('../wsClient');
const { v4: uuidv4 } = require('uuid');


const createTransaction = async (req, res) => {
    try {
        const {deviceId, start, end, duration, cost } = req.body;
        
        // Validasi input
        if (!deviceId || !duration) {
            return res.status(400).json({
                message: 'userId, deviceId, dan duration wajib diisi'
            });
        }


        // Cek apakah device terdaftar di database
        const device = await Device.findByPk(deviceId);
        if (!device) {
            return res.status(404).json({
                message: 'Device tidak ditemukan di database'
            });
        }

        // Cek apakah device terkoneksi ke WebSocket
        const connectedDevices = getConnectionStatus();
        console.log('Checking connection for device:', deviceId);
        console.log('Connected devices:', connectedDevices.devices);
        
        // Cek apakah device ada dalam daftar yang terkoneksi
        const isConnected = connectedDevices.devices.some(device => 
            device.device_id === deviceId || device.deviceId === deviceId
        );
        
        if (!isConnected) {
            return res.status(400).json({
                message: 'Device tidak terkoneksi ke server WebSocket'
            });
        }

        const transactionId = uuidv4();
        //
        // Buat transaksi
        const transaction = await Transaction.create({
            id: transactionId,
            userId: req.user.id,
            deviceId,
            start,
            end,
            duration,
            cost
        });

        // Kirim data ke ESP32
        const result = sendToESP32({
            deviceId,
            timer: Number(duration) // Pastikan timer adalah number
        });

        // Cek hasil pengiriman
        if (!result.success) {
            // Jika gagal mengirim, hapus transaksi
            await transaction.destroy();
            return res.status(500).json({
                message: `Gagal mengirim data ke device: ${result.message}`
            });
        }
      
        return res.status(201).json({
            message: 'Transaksi berhasil dibuat',
            data: {
                transaction,
                deviceCommand: result.data
            }
        });
        
    } catch (error) {
        console.error('Error creating transaction:', error);
        return res.status(500).json({
            message: 'Terjadi kesalahan saat membuat transaksi',
            error: error.message
        });
    }
};

const getAllTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.findAll({
            order: [['createdAt', 'DESC']]
        });
        
        return res.status(200).json({
            message: 'Success',
            data: transactions
        });
    } catch (error) {
        console.error('Error getting transactions:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
};

const getTransactionById = async (req, res) => {
    const { id } = req.params;
    
    try {
       
        const transaction = await Transaction.findByPk(id);
        
        if (!transaction) {
            return res.status(404).json({
                message: 'Transaction not found'
            });
        }
        
        return res.status(200).json({
            message: 'Success',
            data: transaction
        });
    } catch (error) {
        console.error('Error getting transaction:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
};

const getTransactionsByUserId = async (req, res) => {
    const { userId } = req.params;
    
    try {
      

        const transactions = await Transaction.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']]
        });
        
        return res.status(200).json({
            message: 'Success',
            data: transactions
        });
    } catch (error) {
        console.error('Error getting user transactions:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
};

const updateTransaction = async (req, res) => {
    const { id } = req.params;
    const { start, end, duration, cost } = req.body;
    
    try {
       

        const transaction = await Transaction.findByPk(id);
        
        if (!transaction) {
            return res.status(404).json({
                message: 'Transaction not found'
            });
        }
        
        await transaction.update({
            start,
            end,
            duration,
            cost
        });
        
        return res.status(200).json({
            message: 'Transaction updated successfully',
            data: transaction
        });
    } catch (error) {
        console.error('Error updating transaction:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
};

const deleteTransaction = async (req, res) => {
    const { id } = req.params;
    
    try {
        // Validasi UUID format
        if (!isValidUUID(id)) {
            return res.status(400).json({
                message: 'Invalid UUID format'
            });
        }

        const transaction = await Transaction.findByPk(id);
        
        if (!transaction) {
            return res.status(404).json({
                message: 'Transaction not found'
            });
        }
        
        await transaction.destroy();
        
        return res.status(200).json({
            message: 'Transaction deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = { 
    createTransaction,
    getAllTransactions,
    getTransactionById,
    getTransactionsByUserId,
    updateTransaction,
    deleteTransaction
};