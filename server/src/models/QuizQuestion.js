const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QuizQuestion = sequelize.define('QuizQuestion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  question: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('multiple-choice', 'true-false', 'short-answer'),
    allowNull: false
  },
  options: {
    type: DataTypes.JSON,
    allowNull: true // Required for multiple-choice questions
  },
  correctAnswer: {
    type: DataTypes.JSON,
    allowNull: false
  },
  points: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
});

module.exports = QuizQuestion;