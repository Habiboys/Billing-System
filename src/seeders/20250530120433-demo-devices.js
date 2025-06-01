'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Dapatkan ID kategori yang sudah ada
    const categories = await queryInterface.sequelize.query(
      'SELECT id, categoryName from Categories;',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const pcGamingCategory = categories.find(c => c.categoryName === 'PC Gaming');
    const pcBiasaCategory = categories.find(c => c.categoryName === 'PC Biasa');

    return queryInterface.bulkInsert('Devices', [{
      id: uuidv4(),
      name: 'PC Gaming 01',
      categoryId: pcGamingCategory.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }, {
      id: uuidv4(),
      name: 'PC Gaming 02',
      categoryId: pcGamingCategory.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }, {
      id: uuidv4(),
      name: 'PC Biasa 01',
      categoryId: pcBiasaCategory.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.bulkDelete('Devices', null, {});
  }
};