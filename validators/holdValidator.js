const mongoose = require('mongoose');

const validateCreateHold = (req) => {
  const errors = [];
  const { bookId } = req.body;

  if (!bookId) {
    errors.push({ field: 'bookId', message: 'bookId is required to place a reservation hold' });
  } else if (!mongoose.Types.ObjectId.isValid(bookId)) {
    errors.push({ field: 'bookId', message: 'bookId must be a valid 24-character ObjectId' });
  }

  return errors;
};

module.exports = {
  validateCreateHold
};
