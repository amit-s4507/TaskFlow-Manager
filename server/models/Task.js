const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const { Team } = require('./Team');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('todo', 'in_progress', 'review', 'completed'),
    defaultValue: 'todo'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium'
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  attachments: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  }
});

// Define TaskAssignee model for many-to-many relationship
const TaskAssignee = sequelize.define('TaskAssignee', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  }
});

// Define TaskComment model
const TaskComment = sequelize.define('TaskComment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  }
});

// Set up associations
Task.belongsTo(User, { as: 'creator', foreignKey: 'creatorId' });
Task.belongsTo(Team, { as: 'team', foreignKey: 'teamId' });

Task.belongsToMany(User, {
  through: TaskAssignee,
  as: 'assignees'
});

User.belongsToMany(Task, {
  through: TaskAssignee,
  as: 'assignedTasks'
});

Task.hasMany(TaskComment, { as: 'comments' });
TaskComment.belongsTo(Task);
TaskComment.belongsTo(User, { as: 'author' });

module.exports = { Task, TaskAssignee, TaskComment };