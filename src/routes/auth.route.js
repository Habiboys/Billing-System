const express = require('express');
const router = express.Router();
const {tokenValidation, verifyAdmin} = require('../middlewares/auth.middleware')
const{login, refreshToken, createUser} = require('../controllers/auth.controller')

router.post('/login', login)
router.post('/refresh-token', refreshToken)


module.exports = router