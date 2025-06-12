'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.bulkInsert('Categories', [{
      id: uuidv4(),
      categoryName: 'PC Gaming',
      cost: 10000, // Rp 10.000 per jam
      satuanWaktu: 'jam',
      description: 'PC Gaming High End',
      createdAt: new Date(),
      updatedAt: new Date()
    }, {
      id: uuidv4(),
      categoryName: 'PC Biasa',
      cost: 5000, // Rp 5.000 per jam
      satuanWaktu: 'jam',
      description: 'PC untuk browsing dan office',
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.bulkDelete('Categories', null, {});
  }
};