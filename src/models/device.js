'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Device extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Device.belongsTo(models.Category, {
        foreignKey: 'categoryId',
        as: 'category'
      })
      Device.hasMany(models.Transaction, {
        foreignKey: 'deviceId',
        as: 'transactions'
      })
    }
  }
  Device.init({
    id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    name: DataTypes.STRING,
    categoryId: DataTypes.UUID,
    timerStart: {
      type: DataTypes.DATE,
      allowNull: true
    },
    timerDuration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Total duration in milliseconds'
    },
    timerElapsed: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Elapsed time in milliseconds'
    },
    timerStatus: {
      type: DataTypes.ENUM('running', 'paused', 'stopped'),
      allowNull: true,
      defaultValue: null
    },
    lastPausedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when timer was last paused'
    }
  }, {
    sequelize,
    modelName: 'Device',
  });
  return Device;
};