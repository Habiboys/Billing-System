'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Devices', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.STRING
      },
      name: {
        type: Sequelize.STRING
      },
      categoryId: {
        type: Sequelize.UUID,
        reference:{
          model: 'Categories',
          key: 'id'
        }
      },
      timerStart: {
        type: Sequelize.DATE,
        allowNull: true
      },
      timerDuration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Duration in milliseconds'
      },
  
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Devices');
  }
};