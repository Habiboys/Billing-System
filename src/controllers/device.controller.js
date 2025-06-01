const{ Device, User, Category } = require('../models');
const { v4: uuidv4 } = require('uuid');

//create device
const createDevice = async (req, res) => {
    const {name, categoryId} = req.body;
    try{
        const existingDevice = await Device.findOne({
            where: {
                name
            }
        })
        if(existingDevice){
            return res.status(400).json({
                message: 'Device already exists'
            })
        }
        const deviceId= uuidv4();
        const device = await Device.create({
            id: deviceId,
            name,
            categoryId
        })
        return res.status(201).json({
            message: 'Device created',
            data: device
        })
    }catch(error){
        return res.status(500).json({
            message: error.message
        })
    }
}

const getAllDevices = async (req, res) => {
    try{
        const devices = await Device.findAll({
            include: [
                {
                    model: Category,
                    as: 'category'
                },
            ]
        })

        return res.status(200).json({
            message: 'Devices found',
            data: devices
        })
    }catch(error){
        return res.status(500).json({
            message: error.message
        })
    }
}

const getDeviceById = async (req, res) => {
    const {id} = req.params;
    try{
        const device = await Device.findOne({
            where: {
                id
            },
            include: [
                {
                    model: Category,
                    as: 'category'
                },
            ]
        })
        if(!device){
            return res.status(404).json({
                message: 'Device not found'                     
            })
        }
        return res.status(200).json({
            message: 'Device found',
            data: device
        })
    }catch(error){
        return res.status(500).json({
            message: error.message
        })
    }
}

const updateDevice = async (req, res) => {
    const {id} = req.params;
    const {name, categoryId} = req.body;
    try{
        const device = await Device.findOne({
            where: {
                id
            }
        })
        if(!device){
            return res.status(404).json({
                message: 'Device not found'
            })
        }
        device.name = name;
        device.categoryId = categoryId;
        await device.save();
    }catch(error){
        return res.status(500).json({
            message: error.message
        })
    }
}

const deleteDevice = async (req, res) => {
    const {id} = req.params;
    try{
        const device = await Device.findOne({
            where: {
                id
            }
        })
        if(!device){
            return res.status(404).json({
                message: 'Device not found'
            })
        }
        await device.destroy();
        return res.status(200).json({
            message: 'Device deleted'
        })
    }catch(error){
        return res.status(500).json({
            message: error.message
        })
    }
}

module.exports = {
    createDevice,
    getAllDevices,
    getDeviceById,
    updateDevice,
    deleteDevice
}