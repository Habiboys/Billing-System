const express = require("express");
const router = express.Router();
const { 
    createTransaction,
    getAllTransactions,
    getTransactionById,
    getTransactionsByUserId
} = require("../controllers/transaction.controller");
const { tokenValidation, verifyAdmin } = require("../middlewares/auth.middleware");

// Create transaction (memerlukan auth)
router.post("/create", tokenValidation, createTransaction);

// Get all transactions (admin only)
router.get("/", tokenValidation, getAllTransactions);

// Get transaction by ID (memerlukan auth)
router.get("/:id", tokenValidation, getTransactionById);

// Get transactions by user ID (memerlukan auth)
router.get("/user/:userId", tokenValidation, getTransactionsByUserId);

module.exports = router;