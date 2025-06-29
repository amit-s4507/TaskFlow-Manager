const { Task, TaskAssignee, TaskComment } = require('../models/Task');
const { Team } = require('../models/Team');
const User = require('../models/User');

// @desc Create new task
// @route POST /api/tasks
// @access Private
const createTask = async (req, res) => {
  try {
    const { title, description, status, priority, dueDate } = req.body;
    const userId = req.user.id;

    // Create task
    const task = await Task.create({
      title,
      description,
      status: status || 'todo',
      priority: priority || 'medium',
      creatorId: userId,
      dueDate: dueDate || null
    });

    // Get the created task with associations
    const createdTask = await Task.findByPk(task.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task: createdTask }
    });

  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating task',
      error: error.message
    });
  }
};

// @desc Get team tasks
// @route GET /api/tasks/team/:teamId
// @access Private
const getTeamTasks = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;
    const { status, priority, assignedTo, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Check team access
    const team = await Team.findById(teamId);
    if (!team || !team.isMember(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Build query
    let query = { team: teamId, isArchived: false };
    
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const tasks = await Task.find(query)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('completedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Task.countDocuments(query);

    res.status(200).json({
      success: true,
      count: tasks.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: { tasks }
    });

  } catch (error) {
    console.error('Get team tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tasks'
    });
  }
};

// @desc Get single task
// @route GET /api/tasks/:id
// @access Private
const getTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;

    const task = await Task.findByPk(taskId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Team,
          as: 'team',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check team access if task belongs to a team
    if (task.teamId) {
      const team = await Team.findByPk(task.teamId);
      const isMember = await team.hasMember(userId);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    } else if (task.creatorId !== userId) {
      // If not a team task, only creator can access
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        task,
        permissions: {
          canEdit: task.creatorId === userId,
          canDelete: task.creatorId === userId
        }
      }
    });

  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching task'
    });
  }
};

// @desc Update task
// @route PUT /api/tasks/:id
// @access Private
const updateTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    const updates = req.body;

    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user has permission to update
    if (task.creatorId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Cannot edit this task.'
      });
    }

    // Update allowed fields
    const allowedUpdates = ['title', 'description', 'status', 'priority', 'dueDate'];
    const updateData = {};
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    await task.update(updateData);

    // Fetch updated task with associations
    const updatedTask = await Task.findByPk(taskId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: { task: updatedTask }
    });

  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating task',
      error: error.message
    });
  }
};

// @desc Delete task
// @route DELETE /api/tasks/:id
// @access Private
const deleteTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;

    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user has permission to delete
    if (task.creatorId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Cannot delete this task.'
      });
    }

    await task.destroy();

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting task'
    });
  }
};

// @desc Add comment to task
// @route POST /api/tasks/:id/comments
// @access Private
const addComment = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    const { content } = req.body;

    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const comment = await TaskComment.create({
      content,
      taskId,
      authorId: userId
    });

    // Fetch comment with author details
    const commentWithAuthor = await TaskComment.findByPk(comment.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: { comment: commentWithAuthor }
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding comment'
    });
  }
};

// @desc Get my tasks
// @route GET /api/tasks/my-tasks
// @access Private
const getMyTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, priority, page = 1, limit = 20 } = req.query;

    // Build query
    let where = {
      creatorId: userId
    };
    
    if (status) where.status = status;
    if (priority) where.priority = priority;

    // Execute query with pagination
    const offset = (page - 1) * limit;

    const tasks = await Task.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit: parseInt(limit)
    });

    res.status(200).json({
      success: true,
      data: {
        tasks: tasks.rows,
        count: tasks.count,
        page: parseInt(page),
        pages: Math.ceil(tasks.count / limit)
      }
    });

  } catch (error) {
    console.error('Get my tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tasks',
      error: error.message
    });
  }
};

// @desc Get task statistics
// @route GET /api/tasks/stats
// @access Private
const getTaskStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get total tasks for user's teams
    const userTeams = await Team.findAll({
      include: [{
        model: User,
        as: 'members',
        where: { id: userId }
      }]
    });

    const teamIds = userTeams.map(team => team.id);

    const totalTasks = await Task.count({
      where: { teamId: teamIds }
    });

    const pendingTasks = await Task.count({
      where: {
        teamId: teamIds,
        status: ['todo', 'in_progress', 'review']
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalTasks,
        teams: userTeams.length,
        pendingTasks
      }
    });

  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching task statistics'
    });
  }
};

module.exports = {
  createTask,
  getTeamTasks,
  getTask,
  updateTask,
  deleteTask,
  addComment,
  getMyTasks,
  getTaskStats
};