const mongoose = require('mongoose');
const { PAYMENT_METHODS } = require('../constants');

const validateFinePayment = (req) => {
  const errors = [];
  const { transactionId, amount, paymentMethod } = req.body;

  if (!transactionId) {
    errors.push({ field: 'transactionId', message: 'transactionId is required' });
  } else if (!mongoose.Types.ObjectId.isValid(transactionId)) {
    errors.push({ field: 'transactionId', message: 'transactionId must be a valid 24-character ObjectId' });
  }

  if (amount === undefined || typeof Number(amount) !== 'number' || isNaN(Number(amount)) || Number(amount) <= 0) {
    errors.push({ field: 'amount', message: 'Payment amount must be a positive number greater than 0' });
  }

  if (paymentMethod && !Object.values(PAYMENT_METHODS).includes(paymentMethod)) {
    errors.push({ field: 'paymentMethod', message: `Invalid payment method. Allowed: ${Object.values(PAYMENT_METHODS).join(', ')}` });
  }

  return errors;
};

module.exports = {
  validateFinePayment
};
