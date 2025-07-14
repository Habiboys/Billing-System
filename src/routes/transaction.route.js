const express = require("express");
const router = express.Router();
const { 
    createTransaction,
    getAllTransactions,
    getTransactionById,
    getTransactionsByUserId,
    updateTransaction,
    deleteTransaction,
    addTime,
    resumePausedTimer
} = require("../controllers/transaction.controller");
const { tokenValidation, verifyAdmin } = require("../middlewares/auth.middleware");

// Create transaction (memerlukan auth)
router.post("/create", tokenValidation, createTransaction);

// Get all transactions (admin only)
router.get("/", tokenValidation,  getAllTransactions);

// Get transactions by user ID (memerlukan auth)
router.get("/user/:userId", tokenValidation, getTransactionsByUserId);

// Get transaction by ID (memerlukan auth)
router.get("/:id", tokenValidation, getTransactionById);

// Update transaction (admin only)
router.put("/:id", tokenValidation, updateTransaction);

// Delete transaction (admin only)
router.delete("/:id", tokenValidation,  deleteTransaction);

// Add time to transaction (memerlukan auth)
router.post("/:transactionId/add-time", tokenValidation, addTime);

// Resume paused timer (memerlukan auth)
router.post("/device/:deviceId/resume", tokenValidation, async (req, res) => {
    const { deviceId } = req.params;
    
    try {
        const result = await resumePausedTimer(deviceId);
        
        if (result.success) {
            return res.status(200).json({
                message: result.message,
                data: result.data
            });
        } else {
            return res.status(400).json({
                message: result.message
            });
        }
    } catch (error) {
        console.error('Resume timer error:', error);
        return res.status(500).json({
            message: 'Terjadi kesalahan saat resume timer',
            error: error.message
        });
    }
});

module.exports = router;