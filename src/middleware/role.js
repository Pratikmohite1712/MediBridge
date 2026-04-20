const { sendError } = require('../utils/response');

exports.role = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return sendError(res, 'User identity or role not found', 'UNAUTHORIZED', 401);
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 'You do not have permission to access this resource', 'FORBIDDEN', 403);
    }
    
    next();
  };
};
