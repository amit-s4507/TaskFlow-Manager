const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Team = sequelize.define('Team', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

// Define TeamMember model for many-to-many relationship
const TeamMember = sequelize.define('TeamMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  role: {
    type: DataTypes.ENUM('admin', 'member'),
    defaultValue: 'member'
  }
});

// Set up associations
Team.belongsToMany(User, {
  through: TeamMember,
  as: 'members'
});

User.belongsToMany(Team, {
  through: TeamMember,
  as: 'teams'
});

// Instance methods
Team.prototype.hasMember = async function(userId) {
  const member = await TeamMember.findOne({
    where: {
      teamId: this.id,
      userId: userId
    }
  });
  return !!member;
};

Team.prototype.getMemberRole = async function(userId) {
  const member = await TeamMember.findOne({
    where: {
      teamId: this.id,
      userId: userId
    }
  });
  return member ? member.role : null;
};

module.exports = { Team, TeamMember };