const express = require("express");
const router = express.Router();
const { 
    createTransaction,
    getAllTransactions,
    getTransactionById,
    getTransactionsByUserId,
    updateTransaction,
    deleteTransaction
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

module.exports = router;