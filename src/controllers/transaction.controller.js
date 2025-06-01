// transactionController.js
const { Transaction } = require('../models');
const { sendToESP32 } = require('../wsClient');
const { v4: uuidv4 } = require('uuid');


const createTransaction = async (req, res) => {
    try {
        const { userId, deviceId, start, end, duration, cost } = req.body;
        
        // Validasi input
        if (!userId || !deviceId || !duration) {
            return res.status(400).json({
                message: 'userId, deviceId, dan duration wajib diisi'
            });
        }
        const transactionId= uuidv4();
        
        const transaction = await Transaction.create({
            id: transactionId,
            userId,
            deviceId,
            start,
            end,
            duration,
            cost
        });

        // Konversi duration ke milidetik jika diperlukan
        const durationInMs = duration * 1000;
        
        // Kirim data ke ESP32 dengan format yang benar
        const dataToESP32 = {
            timer: durationInMs,

        };
        
        console.log('Mengirim data ke ESP32:', dataToESP32);
        sendToESP32(dataToESP32);
      
        return res.status(201).json({
            message: 'Transaction created successfully',
            transaction,
            sentToDevice: dataToESP32
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