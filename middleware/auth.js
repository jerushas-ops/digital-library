const { verifyToken } = require('../utils/generateToken');
const User = require('../models/User');
const { UnauthorizedError, ForbiddenError } = require('../utils/customErrors');
const { USER_STATUSES, ERROR_CODES } = require('../constants');

const authenticateToken = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(new UnauthorizedError('Authentication token required. Please provide a valid Bearer token.'));
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new UnauthorizedError('Token has expired. Please log in again.', ERROR_CODES.UNAUTHORIZED));
      }
      return next(new UnauthorizedError('Invalid authentication token.', ERROR_CODES.UNAUTHORIZED));
    }

    const user = await User.findById(decoded.userId).populate('membershipPlanId');
    if (!user) {
      return next(new UnauthorizedError('User belonging to this token no longer exists.'));
    }

    if (user.status === USER_STATUSES.INACTIVE) {
      return next(new ForbiddenError('Your account is currently inactive. Please contact the administrator.', ERROR_CODES.ACCOUNT_INACTIVE));
    }

    if (user.status === USER_STATUSES.SUSPENDED) {
      return next(new ForbiddenError('Your account has been suspended due to overdue violations or library policies.', ERROR_CODES.ACCOUNT_SUSPENDED));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticateToken;
