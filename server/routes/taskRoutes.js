const express = require('express');
const {
  createTask,
  getTeamTasks,
  getTask,
  updateTask,
  deleteTask,
  addComment,
  getMyTasks,
  getTaskStats
} = require('../controllers/taskController');

const { protect } = require('../middleware/auth');

const router = express.Router();

// Protect all routes - user must be logged in
router.use(protect);

// Get task statistics
router.get('/stats', getTaskStats);

// Task routes
router.route('/')
  .post(createTask);  // POST /api/tasks - Create new task

router.route('/my-tasks')
  .get(getMyTasks);   // GET /api/tasks/my-tasks - Get user's tasks

router.route('/team/:teamId')
  .get(getTeamTasks); // GET /api/tasks/team/:teamId - Get team's tasks

router.route('/:id')
  .get(getTask)       // GET /api/tasks/:id - Get single task
  .put(updateTask)    // PUT /api/tasks/:id - Update task
  .delete(deleteTask); // DELETE /api/tasks/:id - Delete task

router.route('/:id/comments')
  .post(addComment);  // POST /api/tasks/:id/comments - Add comment

module.exports = router;