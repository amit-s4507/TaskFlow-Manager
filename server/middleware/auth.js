const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - Authentication check
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in authentication middleware',
      error: error.message
    });
  }
};

// Role authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Team member authorization
const teamMember = async (req, res, next) => {
  try {
    const teamId = req.params.teamId || req.body.teamId;
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID is required'
      });
    }

    const membership = await req.user.getTeams({
      where: { id: teamId },
      through: { attributes: ['role'] }
    });

    if (!membership || membership.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this team'
      });
    }

    // Add team role to request object
    req.teamRole = membership[0].TeamMember.role;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking team membership',
      error: error.message
    });
  }
};

module.exports = { protect, authorize, teamMember };