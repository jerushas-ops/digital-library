const { ERROR_CODES } = require('../constants');
const { AppError } = require('../utils/customErrors');

/**
 * Centralized Global Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Details]:', err);
  }

  // 1. Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Invalid format for resource identifier: ${err.value}`;
    error = new AppError(message, 400, ERROR_CODES.VALIDATION_ERROR, [
      { field: err.path, message: `Invalid ID value '${err.value}'` }
    ]);
  }

  // 2. Mongoose Duplicate Key Error (Code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    const message = `Duplicate value '${value}' for field '${field}'. Record already exists.`;
    error = new AppError(message, 409, ERROR_CODES.CONFLICT, [
      { field, message: `The ${field} '${value}' is already registered.` }
    ]);
  }

  // 3. Mongoose Schema Validation Error
  if (err.name === 'ValidationError') {
    const validationErrors = Object.values(err.errors || {}).map((val) => ({
      field: val.path,
      message: val.message
    }));
    const message = 'Validation failed for one or more fields.';
    error = new AppError(message, 400, ERROR_CODES.VALIDATION_ERROR, validationErrors);
  }

  // 4. JWT Authentication Errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid authentication token', 401, ERROR_CODES.UNAUTHORIZED);
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Authentication token has expired. Please log in again.', 401, ERROR_CODES.UNAUTHORIZED);
  }

  // Determine final status & response body
  const statusCode = error.statusCode || 500;
  const errorCode = error.errorCode || (statusCode >= 500 ? ERROR_CODES.INTERNAL_SERVER_ERROR : ERROR_CODES.VALIDATION_ERROR);
  const responseMessage = error.message || 'An unexpected server error occurred.';

  const responsePayload = {
    success: false,
    message: responseMessage,
    errorCode
  };

  if (error.errors && error.errors.length > 0) {
    responsePayload.errors = error.errors;
  }

  // Only include stack trace if explicitly in development and error is 500
  if (process.env.NODE_ENV === 'development' && statusCode === 500) {
    responsePayload.stack = err.stack;
  }

  return res.status(statusCode).json(responsePayload);
};

module.exports = errorHandler;
