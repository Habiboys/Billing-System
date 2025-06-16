'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Transaction.belongsTo(models.Device, {
        foreignKey: 'deviceId',
        // as: 'device'
      })
    }
  }
  Transaction.init({
        id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    deviceId: DataTypes.UUID,
    start: DataTypes.DATE,
    end: DataTypes.DATE,
    duration: DataTypes.INTEGER,
    cost: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Transaction',
  });
  return Transaction;
};