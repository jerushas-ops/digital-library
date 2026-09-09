const { BadRequestError } = require('../utils/customErrors');
const { ERROR_CODES } = require('../constants');

/**
 * Higher-order middleware that runs a custom validation function against req
 * @param {Function} validatorFn - Function receiving req returning array of error objects: { field, message }
 */
const validate = (validatorFn) => {
  return (req, res, next) => {
    const errors = validatorFn(req);
    if (errors && errors.length > 0) {
      return next(new BadRequestError('Validation failed for one or more fields.', ERROR_CODES.VALIDATION_ERROR, errors));
    }
    next();
  };
};

module.exports = validate;
