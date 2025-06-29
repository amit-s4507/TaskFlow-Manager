const Team = require('../models/Team');
const User = require('../models/User');

// @desc Create new team
// @route POST /api/teams
// @access Private
const createTeam = async (req, res) => {
  try {
    const { name, description, isPrivate = false } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Team name is required'
      });
    }

    // Create team
    const team = await Team.create({
      name: name.trim(),
      description: description?.trim(),
      owner: userId,
      settings: {
        isPrivate,
        allowMembersToInvite: false,
        taskPermissions: {
          memberCanCreate: true,
          memberCanEdit: true,
          memberCanDelete: false
        }
      }
    });

    // Generate invite code
    team.generateInviteCode();
    await team.save();

    // Populate owner details
    await team.populate('owner', 'name email');
    await team.populate('members.user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: { team }
    });

  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating team',
      error: error.message
    });
  }
};

// @desc Get user's teams
// @route GET /api/teams
// @access Private
const getMyTeams = async (req, res) => {
  try {
    const userId = req.user.id;

    const teams = await Team.find({
      'members.user': userId,
      isActive: true
    })
    .populate('owner', 'name email')
    .populate('members.user', 'name email')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: teams.length,
      data: { teams }
    });

  } catch (error) {
    console.error('Get my teams error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teams'
    });
  }
};

// @desc Get single team
// @route GET /api/teams/:id
// @access Private
const getTeam = async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user.id;

    const team = await Team.findById(teamId)
      .populate('owner', 'name email')
      .populate('members.user', 'name email')
      .populate('members.invitedBy', 'name email');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if user is a member
    if (!team.isMember(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this team.'
      });
    }

    const userRole = team.getUserRole(userId);

    res.status(200).json({
      success: true,
      data: {
        team,
        userRole,
        permissions: {
          canEdit: userRole === 'owner' || userRole === 'admin',
          canDelete: userRole === 'owner',
          canInvite: team.hasPermission(userId, 'invite'),
          canManageMembers: userRole === 'owner' || userRole === 'admin'
        }
      }
    });

  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team'
    });
  }
};

// @desc Update team
// @route PUT /api/teams/:id
// @access Private
const updateTeam = async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user.id;
    const updates = req.body;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check permissions (only owner and admin can update)
    const userRole = team.getUserRole(userId);
    if (userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'description', 'settings'];
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        if (field === 'settings') {
          // Merge settings instead of replacing
          team.settings = { ...team.settings, ...updates[field] };
        } else {
          team[field] = updates[field];
        }
      }
    });

    await team.save();

    await team.populate([
      { path: 'owner', select: 'name email' },
      { path: 'members.user', select: 'name email' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Team updated successfully',
      data: { team }
    });

  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating team'
    });
  }
};

// @desc Delete team
// @route DELETE /api/teams/:id
// @access Private
const deleteTeam = async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user.id;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Only owner can delete team
    if (team.owner.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only team owner can delete the team.'
      });
    }

    // Soft delete - mark as inactive
    team.isActive = false;
    await team.save();

    res.status(200).json({
      success: true,
      message: 'Team deleted successfully'
    });

  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting team'
    });
  }
};

// @desc Invite member to team
// @route POST /api/teams/:id/members
// @access Private
const inviteMember = async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user.id;
    const { email, role = 'member' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check permission to invite
    if (!team.hasPermission(userId, 'invite')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You cannot invite members to this team.'
      });
    }

    // Find user by email
    const userToInvite = await User.findOne({ email: email.toLowerCase() });
    if (!userToInvite) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email'
      });
    }

    // Check if user is already a member
    if (team.isMember(userToInvite._id)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this team'
      });
    }

    // Add member to team
    team.addMember(userToInvite._id, role, userId);
    await team.save();

    await team.populate('members.user', 'name email');

    res.status(200).json({
      success: true,
      message: 'Member invited successfully',
      data: {
        member: team.members.find(m => m.user._id.toString() === userToInvite._id.toString())
      }
    });

  } catch (error) {
    console.error('Invite member error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error inviting member'
    });
  }
};

// @desc Join team by invite code
// @route POST /api/teams/join/:inviteCode
// @access Private
const joinTeam = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const userId = req.user.id;

    const team = await Team.findByInviteCode(inviteCode);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Invalid invite code'
      });
    }

    // Check if user is already a member
    if (team.isMember(userId)) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this team'
      });
    }

    // Add user to team
    team.addMember(userId, 'member');
    await team.save();

    await team.populate([
      { path: 'owner', select: 'name email' },
      { path: 'members.user', select: 'name email' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Successfully joined the team',
      data: { team }
    });

  } catch (error) {
    console.error('Join team error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error joining team'
    });
  }
};

// @desc Remove member from team
// @route DELETE /api/teams/:id/members/:userId
// @access Private
const removeMember = async (req, res) => {
  try {
    const { id: teamId, userId: memberToRemove } = req.params;
    const currentUserId = req.user.id;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const currentUserRole = team.getUserRole(currentUserId);
    
    // Check permissions
    if (currentUserRole !== 'owner' && currentUserRole !== 'admin') {
      // Members can only remove themselves
      if (currentUserId !== memberToRemove) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }
    }

    team.removeMember(memberToRemove);
    await team.save();

    res.status(200).json({
      success: true,
      message: 'Member removed successfully'
    });

  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error removing member'
    });
  }
};

// @desc Update member role
// @route PUT /api/teams/:id/members/:userId
// @access Private
const updateMemberRole = async (req, res) => {
  try {
    const { id: teamId, userId: memberToUpdate } = req.params;
    const currentUserId = req.user.id;
    const { role } = req.body;

    if (!role || !['admin', 'member'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Valid role is required (admin or member)'
      });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Only owner can update member roles
    if (team.owner.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only team owner can update member roles.'
      });
    }

    team.updateMemberRole(memberToUpdate, role);
    await team.save();

    await team.populate('members.user', 'name email');

    res.status(200).json({
      success: true,
      message: 'Member role updated successfully',
      data: {
        member: team.members.find(m => m.user._id.toString() === memberToUpdate)
      }
    });

  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating member role'
    });
  }
};

// @desc Get team members
// @route GET /api/teams/:id/members
// @access Private
const getTeamMembers = async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = req.user.id;

    const team = await Team.findById(teamId)
      .populate('members.user', 'name email')
      .populate('members.invitedBy', 'name email');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if user is a member
    if (!team.isMember(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this team.'
      });
    }

    res.status(200).json({
      success: true,
      count: team.members.length,
      data: {
        members: team.members,
        inviteCode: team.inviteCode
      }
    });

  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team members'
    });
  }
};

module.exports = {
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
};