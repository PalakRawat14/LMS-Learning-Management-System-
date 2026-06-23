const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SubjectTeacher = sequelize.define('SubjectTeacher', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  subjectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Subjects', key: 'id' }
  },
  teacherId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' }
  }
});

module.exports = SubjectTeacher;
