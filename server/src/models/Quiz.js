const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Quiz = sequelize.define('Quiz', {
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
    allowNull: true
  },
  timeLimit: {
    type: DataTypes.INTEGER, // in minutes
    allowNull: true
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  totalPoints: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  allowReview: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

module.exports = Quiz;