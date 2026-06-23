const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Course = sequelize.define('Course', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  thumbnail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  enrollmentLimit: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  teacherId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  courseField: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'e.g., B.Tech, BCA, MBA, etc. - Students can only see courses for their field'
  }
});

module.exports = Course;