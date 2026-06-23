const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TeacherInvitation = sequelize.define('TeacherInvitation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  invitationToken: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'expired'),
    defaultValue: 'pending'
  },
  invitedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  courseField: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'e.g., B.Tech, BCA, MBA, etc.'
  }
}, {
  timestamps: true,
  tableName: 'TeacherInvitations'
});

module.exports = TeacherInvitation;
