const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SubjectSubmission = sequelize.define('SubjectSubmission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  subjectAssignmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'SubjectAssignments', key: 'id' }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true
  },
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  grade: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('submitted', 'graded'),
    defaultValue: 'submitted'
  }
});

module.exports = SubjectSubmission;
