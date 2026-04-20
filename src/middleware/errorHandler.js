const { sendError } = require('../utils/response');
const { ZodError } = require('zod');

exports.globalErrorHandler = (err, req, res, next) => {
  console.error('[Error Details]:', err);

  // Prisma Unique Constraint Error
  if (err.code === 'P2002') {
    const target = err.meta && err.meta.target ? err.meta.target : 'field';
    return sendError(res, `Duplicate resource: A record with that ${target} already exists.`, 'CONFLICT', 409);
  }

  // Prisma Record Not Found
  if (err.code === 'P2025') {
    return sendError(res, 'The requested record was not found.', 'NOT_FOUND', 404);
  }

  // Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map(e => ({ path: e.path.join('.'), message: e.message }));
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      statusCode: 422,
      details: formattedErrors
    });
  }

  // JWT Errors
  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid authentication token', 'UNAUTHORIZED', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token has expired', 'TOKEN_EXPIRED', 401);
  }

  // Fallback for all other errors
  return sendError(
    res, 
    err.message || 'An unexpected error occurred on the server', 
    'INTERNAL_SERVER_ERROR', 
    err.statusCode || 500
  );
};
