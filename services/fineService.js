const Transaction = require('../models/Transaction');
const FinePayment = require('../models/FinePayment');
const User = require('../models/User');
const { ConflictError, BadRequestError, NotFoundError } = require('../utils/customErrors');
const { ERROR_CODES, FINE_STATUSES, PAYMENT_METHODS, NOTIFICATION_TYPES } = require('../constants');
const { createNotification } = require('./notificationService');
const { logAudit } = require('./auditService');

/**
 * Compute overdue days and fine amount
 */
const calculateOverdueFine = (dueDate, returnDate = new Date(), finePerDay = 5) => {
  const due = new Date(dueDate);
  const actualReturn = new Date(returnDate);

  if (actualReturn <= due) {
    return { overdueDays: 0, fine: 0 };
  }

  const diffTime = actualReturn.getTime() - due.getTime();
  const overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const fine = overdueDays * finePerDay;

  return { overdueDays, fine };
};

/**
 * Re-calculate total outstanding fines for a member
 */
const refreshMemberOutstandingFines = async (memberId) => {
  const activeUnpaidTransactions = await Transaction.find({
    memberId,
    fine: { $gt: 0 },
    fineStatus: { $in: [FINE_STATUSES.UNPAID, FINE_STATUSES.PARTIALLY_PAID] }
  });

  const totalOutstanding = activeUnpaidTransactions.reduce((acc, curr) => {
    return acc + Math.max(0, curr.fine - (curr.finePaid || 0));
  }, 0);

  await User.findByIdAndUpdate(memberId, { outstandingFines: totalOutstanding });
  return totalOutstanding;
};

/**
 * Record payment for an outstanding fine
 */
const processFinePayment = async ({
  transactionId,
  memberId,
  amount,
  paymentMethod = PAYMENT_METHODS.ONLINE_SIMULATED,
  recordedBy = null,
  notes = '',
  ipAddress = ''
}) => {
  const transaction = await Transaction.findById(transactionId).populate('bookId memberId');
  if (!transaction) {
    throw new NotFoundError('Transaction not found', ERROR_CODES.NOT_FOUND);
  }

  // Ensure member matches if memberId is passed
  if (memberId && transaction.memberId._id.toString() !== memberId.toString()) {
    throw new BadRequestError('Transaction does not belong to specified member');
  }

  const currentOutstanding = Math.max(0, transaction.fine - transaction.finePaid);

  if (currentOutstanding <= 0) {
    throw new ConflictError('Fine for this transaction is already fully settled or waived', ERROR_CODES.FINE_ALREADY_PAID);
  }

  const numAmount = Number(amount);
  if (numAmount > currentOutstanding) {
    throw new BadRequestError(
      `Payment amount ($${numAmount}) exceeds outstanding fine balance of $${currentOutstanding}`,
      ERROR_CODES.EXCEEDS_OUTSTANDING_FINE
    );
  }

  // Create payment record
  const payment = await FinePayment.create({
    transactionId: transaction._id,
    memberId: transaction.memberId._id,
    amount: numAmount,
    paymentMethod,
    recordedBy,
    status: FINE_STATUSES.PAID,
    notes,
    paidAt: new Date()
  });

  // Update transaction
  transaction.finePaid += numAmount;
  if (transaction.finePaid >= transaction.fine) {
    transaction.fineStatus = FINE_STATUSES.PAID;
  } else {
    transaction.fineStatus = FINE_STATUSES.PARTIALLY_PAID;
  }
  await transaction.save();

  // Refresh user balance
  const remainingTotalFines = await refreshMemberOutstandingFines(transaction.memberId._id);

  // Dispatch notification
  await createNotification({
    memberId: transaction.memberId._id,
    transactionId: transaction._id,
    type: NOTIFICATION_TYPES.FINE_PAYMENT,
    title: 'Fine Payment Received',
    message: `Payment of $${numAmount.toFixed(2)} received for "${transaction.bookId.title}". Outstanding on this loan: $${Math.max(0, transaction.fine - transaction.finePaid).toFixed(2)}.`
  });

  // Audit log
  await logAudit({
    actorId: recordedBy || transaction.memberId._id,
    action: 'FINE_PAYMENT_RECORDED',
    resource: 'FinePayment',
    resourceId: payment._id,
    metadata: {
      transactionId: transaction._id,
      amount: numAmount,
      paymentMethod,
      remainingOutstanding: remainingTotalFines
    },
    ipAddress
  });

  return {
    payment,
    transaction,
    memberOutstandingFines: remainingTotalFines
  };
};

/**
 * Waive a fine (Librarian/Admin only)
 */
const waiveFine = async ({ transactionId, recordedBy, notes = '', ipAddress = '' }) => {
  const transaction = await Transaction.findById(transactionId).populate('bookId memberId');
  if (!transaction) {
    throw new NotFoundError('Transaction not found');
  }

  const currentOutstanding = Math.max(0, transaction.fine - transaction.finePaid);
  if (currentOutstanding <= 0) {
    throw new ConflictError('Fine is already settled or waived', ERROR_CODES.FINE_ALREADY_PAID);
  }

  const payment = await FinePayment.create({
    transactionId: transaction._id,
    memberId: transaction.memberId._id,
    amount: currentOutstanding,
    paymentMethod: PAYMENT_METHODS.WAIVED,
    recordedBy,
    status: FINE_STATUSES.WAIVED,
    notes: notes || 'Fine waived by authorized librarian/admin'
  });

  transaction.fineStatus = FINE_STATUSES.WAIVED;
  await transaction.save();

  const remainingTotalFines = await refreshMemberOutstandingFines(transaction.memberId._id);

  await createNotification({
    memberId: transaction.memberId._id,
    transactionId: transaction._id,
    type: NOTIFICATION_TYPES.FINE_PAYMENT,
    title: 'Fine Waived',
    message: `An outstanding fine of $${currentOutstanding.toFixed(2)} for "${transaction.bookId.title}" has been waived.`
  });

  await logAudit({
    actorId: recordedBy,
    action: 'FINE_WAIVED',
    resource: 'FinePayment',
    resourceId: payment._id,
    metadata: {
      transactionId: transaction._id,
      waivedAmount: currentOutstanding,
      notes
    },
    ipAddress
  });

  return {
    payment,
    transaction,
    memberOutstandingFines: remainingTotalFines
  };
};

module.exports = {
  calculateOverdueFine,
  refreshMemberOutstandingFines,
  processFinePayment,
  waiveFine
};
