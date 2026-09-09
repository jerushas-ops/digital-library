const mongoose = require('mongoose');
const { TRANSACTION_STATUSES, FINE_STATUSES } = require('../constants');

const transactionSchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: [true, 'Book reference is required']
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Member reference is required']
    },
    issueDate: {
      type: Date,
      default: Date.now
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required']
    },
    returnDate: {
      type: Date,
      default: null
    },
    fine: {
      type: Number,
      default: 0,
      min: [0, 'Fine cannot be negative']
    },
    finePaid: {
      type: Number,
      default: 0,
      min: [0, 'Paid fine cannot be negative']
    },
    fineStatus: {
      type: String,
      enum: {
        values: Object.values(FINE_STATUSES),
        message: 'Invalid fine status: {VALUE}'
      },
      default: FINE_STATUSES.UNPAID
    },
    status: {
      type: String,
      enum: {
        values: Object.values(TRANSACTION_STATUSES),
        message: 'Invalid transaction status: {VALUE}'
      },
      default: TRANSACTION_STATUSES.ACTIVE
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    returnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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
transactionSchema.index({ bookId: 1 });
transactionSchema.index({ memberId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ dueDate: 1 });
transactionSchema.index({ memberId: 1, bookId: 1, status: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
