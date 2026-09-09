/**
 * Standardized API Response Utilities
 */

const successResponse = (res, message = 'Success', data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const errorResponse = (res, message = 'Internal Server Error', statusCode = 500, errorCode = 'INTERNAL_SERVER_ERROR', errors = []) => {
  const responsePayload = {
    success: false,
    message,
    errorCode
  };

  if (errors && errors.length > 0) {
    responsePayload.errors = errors;
  }

  return res.status(statusCode).json(responsePayload);
};

const paginatedResponse = (res, message = 'Success', docs = [], total = 0, page = 1, limit = 10) => {
  const totalPages = Math.ceil(total / limit) || 1;
  return res.status(200).json({
    success: true,
    message,
    data: {
      items: docs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  });
};

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse
};
