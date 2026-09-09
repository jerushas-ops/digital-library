const { ForbiddenError } = require('../utils/customErrors');
const { ERROR_CODES } = require('../constants');

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied. Role '${req.user ? req.user.role : 'GUEST'}' is not authorized to access this resource.`,
          ERROR_CODES.FORBIDDEN
        )
      );
    }
    next();
  };
};

module.exports = authorizeRoles;
