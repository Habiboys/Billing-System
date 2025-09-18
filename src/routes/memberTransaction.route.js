const express = require('express');
const router = express.Router();
const {
    createMemberTransaction,
    getAllMemberTransactions,
    getMemberTransactionById,
    getMemberTransactionsByMemberId,
    updateMemberTransaction,
    deleteMemberTransaction
} = require('../controllers/memberTransaction.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

// POST /api/member-transactions - Create new member transaction with PIN validation
router.post('/', authenticateToken, createMemberTransaction);

// GET /api/member-transactions - Get all member transactions with optional filters
router.get('/', authenticateToken, getAllMemberTransactions);

// GET /api/member-transactions/:id - Get member transaction by ID
router.get('/:id', authenticateToken, getMemberTransactionById);

// GET /api/member-transactions/member/:memberId - Get transactions by member ID
router.get('/member/:memberId', authenticateToken, getMemberTransactionsByMemberId);

// PUT /api/member-transactions/:id - Update member transaction
router.put('/:id', authenticateToken, updateMemberTransaction);

// DELETE /api/member-transactions/:id - Delete member transaction
router.delete('/:id', authenticateToken, deleteMemberTransaction);

module.exports = router;

