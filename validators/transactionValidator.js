const mongoose = require('mongoose');

const validateIssueTransaction = (req) => {
  const errors = [];
  const { bookId, memberId } = req.body;

  if (!bookId) {
    errors.push({ field: 'bookId', message: 'bookId is required' });
  } else if (!mongoose.Types.ObjectId.isValid(bookId)) {
    errors.push({ field: 'bookId', message: 'bookId must be a valid 24-character ObjectId' });
  }

  if (!memberId) {
    errors.push({ field: 'memberId', message: 'memberId is required' });
  } else if (!mongoose.Types.ObjectId.isValid(memberId)) {
    errors.push({ field: 'memberId', message: 'memberId must be a valid 24-character ObjectId' });
  }

  return errors;
};

const validateReturnTransaction = (req) => {
  const errors = [];
  const transactionId = req.params.id || req.body.transactionId;

  if (!transactionId) {
    errors.push({ field: 'id', message: 'Transaction ID is required' });
  } else if (!mongoose.Types.ObjectId.isValid(transactionId)) {
    errors.push({ field: 'id', message: 'Transaction ID must be a valid 24-character ObjectId' });
  }

  return errors;
};

module.exports = {
  validateIssueTransaction,
  validateReturnTransaction
};
