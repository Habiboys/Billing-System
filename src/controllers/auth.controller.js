const {User}= require('../models')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid');

// login Admin
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const accesToken = jwt.sign({ id: user.id, email: user.email }, 'secret', { expiresIn: '1h' });
        const refreshToken = jwt.sign({ id: user.id, email: user.email },'secret', { expiresIn: '7d' });
        await User.update({ refresh_token: refreshToken }, { where: { id: user.id } });
        return res.status(200).json({
            message: 'Login successful',
            data:{
                accesToken,
                refreshToken
            }

        })
    }catch (error) {
        console.log(error)
        return res.status(500).json({ message: 'Internal server error' });
    }
}


const createUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4(); // Generate UUID
        
        const user = await User.create({ 
            id: userId, // Set UUID sebagai ID
            email, 
            password: hashedPassword, 
            type: 'user' 
        });
        
        return res.status(201).json({ message: 'User created successfully', data: user });
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: 'Internal server error' });
    }
}
//refresh token
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body; // Mengambil refreshToken dari body permintaan
        const user = await User.findOne({ where: { token: refreshToken } }); // Menggunakan kolom 'token' untuk refresh token
        if (!user) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        // Generate new access token
        const accesToken = jwt.sign({ id: user.id, email: user.email, type: user.type }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Generate new refresh token (optional, but good practice for security)
        const newRefreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
        user.token = newRefreshToken; // Update refresh token in database
        await user.save();

        return res.status(200).json({ accesToken, refreshToken: newRefreshToken });
    } catch (error) {
        console.error('Error refreshing token:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    login,
    createUser,
    refreshToken
}