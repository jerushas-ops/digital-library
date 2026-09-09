const mongoose = require('mongoose');
const { PAYMENT_METHODS, FINE_STATUSES } = require('../constants');

const finePaymentSchema = new mongoose.Schema(
  {
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: [true, 'Transaction reference is required']
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Member reference is required']
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0.01, 'Payment amount must be greater than zero']
    },
    paymentMethod: {
      type: String,
      enum: {
        values: Object.values(PAYMENT_METHODS),
        message: 'Invalid payment method: {VALUE}'
      },
      default: PAYMENT_METHODS.ONLINE_SIMULATED
    },
    reference: {
      type: String,
      trim: true,
      default: () => `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: [FINE_STATUSES.PAID, FINE_STATUSES.WAIVED],
      default: FINE_STATUSES.PAID
    },
    paidAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Indexes
finePaymentSchema.index({ transactionId: 1 });
finePaymentSchema.index({ memberId: 1 });
finePaymentSchema.index({ paidAt: -1 });

module.exports = mongoose.model('FinePayment', finePaymentSchema);
