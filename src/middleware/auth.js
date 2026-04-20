const { verifyAccessToken } = require('../utils/jwt');
const { sendError } = require('../utils/response');

exports.authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication token missing or invalid format', 'UNAUTHORIZED', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return sendError(res, 'Authentication token missing', 'UNAUTHORIZED', 401);
    }

    const decoded = verifyAccessToken(token);
    req.user = { userId: decoded.userId, role: decoded.role };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Access token has expired', 'TOKEN_EXPIRED', 401);
    }
    return sendError(res, 'Invalid authentication token', 'UNAUTHORIZED', 401);
  }
};
