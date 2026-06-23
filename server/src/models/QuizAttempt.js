const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QuizAttempt = sequelize.define('QuizAttempt', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  answers: {
    type: DataTypes.JSON,
    allowNull: false
  },
  score: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('in-progress', 'completed', 'timed-out'),
    defaultValue: 'in-progress'
  }
});

module.exports = QuizAttempt;