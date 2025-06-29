const express = require('express');
const {
  createTeam,
  getMyTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  inviteMember,
  joinTeam,
  removeMember,
  updateMemberRole,
  getTeamMembers
} = require('../controllers/teamController');

const { protect } = require('../middleware/auth');

const router = express.Router();

// Protect all routes - user must be logged in
router.use(protect);

// Team routes
router.route('/')
  .post(createTeam)     // POST /api/teams - Create new team
  .get(getMyTeams);     // GET /api/teams - Get user's teams

router.route('/:id')
  .get(getTeam)         // GET /api/teams/:id - Get single team
  .put(updateTeam)      // PUT /api/teams/:id - Update team
  .delete(deleteTeam);  // DELETE /api/teams/:id - Delete team

router.route('/:id/members')
  .get(getTeamMembers)  // GET /api/teams/:id/members - Get team members
  .post(inviteMember);  // POST /api/teams/:id/members - Invite member

router.route('/:id/members/:userId')
  .delete(removeMember) // DELETE /api/teams/:id/members/:userId - Remove member
  .put(updateMemberRole); // PUT /api/teams/:id/members/:userId - Update member role

router.route('/join/:inviteCode')
  .post(joinTeam);      // POST /api/teams/join/:inviteCode - Join team by invite code

module.exports = router;