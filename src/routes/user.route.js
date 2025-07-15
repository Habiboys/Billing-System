const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all users
router.get('/', userController.getAllUsers);

// Get user by ID
router.get('/:userId', userController.getUserById);

// Create new user
router.post('/', userController.createUser);

// Block/Unblock user
router.patch('/:userId/block', userController.blockUser);

module.exports = router;
