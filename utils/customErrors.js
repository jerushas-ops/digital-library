const { ERROR_CODES } = require('../constants');

class AppError extends Error {
  constructor(message, statusCode, errorCode = ERROR_CODES.INTERNAL_SERVER_ERROR, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.errors = errors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad Request', errorCode = ERROR_CODES.VALIDATION_ERROR, errors = []) {
    super(message, 400, errorCode, errors);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access', errorCode = ERROR_CODES.UNAUTHORIZED) {
    super(message, 401, errorCode);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', errorCode = ERROR_CODES.FORBIDDEN) {
    super(message, 403, errorCode);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found', errorCode = ERROR_CODES.NOT_FOUND) {
    super(message, 404, errorCode);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict with current resource state', errorCode = ERROR_CODES.CONFLICT) {
    super(message, 409, errorCode);
  }
}

class UnprocessableEntityError extends AppError {
  constructor(message = 'Unprocessable entity', errorCode = ERROR_CODES.VALIDATION_ERROR, errors = []) {
    super(message, 422, errorCode, errors);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError
};
