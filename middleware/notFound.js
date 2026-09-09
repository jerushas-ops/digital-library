const { ERROR_CODES } = require('../constants');

const notFound = (req, res, next) => {
  return res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    errorCode: ERROR_CODES.NOT_FOUND
  });
};

module.exports = notFound;
