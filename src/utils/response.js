exports.sendSuccess = (res, message, data = null, statusCode = 200, pagination = null) => {
  const response = {
    success: true,
    message,
    data,
  };
  if (pagination) {
    response.pagination = pagination;
  }
  return res.status(statusCode).json(response);
};

exports.sendError = (res, message, errorCode = 'INTERNAL_SERVER_ERROR', statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: errorCode,
    statusCode,
  });
};
