// middleware/validateUUID.js
const { validate: isValidUUID } = require('uuid');

const validateUUID = (req, res, next) => {
    const { id } = req.params;
    
    if (!isValidUUID(id)) {
        return res.status(400).json({
            message: 'Invalid UUID format'
        });
    }
    
    next();
};

module.exports = validateUUID;