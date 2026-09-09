const Transaction = require('../models/Transaction');
const Book = require('../models/Book');
const User = require('../models/User');
const Hold = require('../models/Hold');
const MembershipPlan = require('../models/MembershipPlan');
const { ConflictError, BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const {
  ERROR_CODES,
  TRANSACTION_STATUSES,
  BOOK_STATUSES,
  USER_STATUSES,
  HOLD_STATUSES,
  NOTIFICATION_TYPES,
  FINE_STATUSES
} = require('../constants');
const { calculateOverdueFine, refreshMemberOutstandingFines } = require('./fineService');
const { processNextHoldOnBookReturn } = require('./holdService');
const { createNotification } = require('./notificationService');
const { logAudit } = require('./auditService');

/**
 * Issue a book to a member with strict business rule validation
 */
const issueBook = async ({ bookId, memberId, issuedBy, notes = '', ipAddress = '' }) => {
  // 1. Validate Member
  const member = await User.findById(memberId).populate('membershipPlanId');
  if (!member) {
    throw new NotFoundError('Member not found', ERROR_CODES.NOT_FOUND);
  }

  if (member.status === USER_STATUSES.INACTIVE) {
    throw new ForbiddenError('Member account is inactive. Cannot issue books.', ERROR_CODES.ACCOUNT_INACTIVE);
  }

  if (member.status === USER_STATUSES.SUSPENDED) {
    throw new ForbiddenError('Member account is suspended. Borrowing is blocked.', ERROR_CODES.ACCOUNT_SUSPENDED);
  }

  // Retrieve plan details (or fallback to default)
  let plan = member.membershipPlanId;
  if (!plan) {
    plan = await MembershipPlan.findOne({ isDefault: true }) || {
      maximumBooks: Number(process.env.DEFAULT_STUDENT_MAX_BOOKS) || 3,
      loanDurationDays: Number(process.env.DEFAULT_STUDENT_LOAN_DAYS) || 14,
      finePerDay: Number(process.env.DEFAULT_FINE_PER_DAY) || 5,
      fineThreshold: 20,
      borrowingEnabled: true
    };
  }

  if (plan.borrowingEnabled === false) {
    throw new ForbiddenError('Borrowing privileges are disabled for this membership plan.', ERROR_CODES.FORBIDDEN);
  }

  // Check active borrowing limit
  const activeLoansCount = await Transaction.countDocuments({
    memberId,
    status: { $in: [TRANSACTION_STATUSES.ACTIVE, TRANSACTION_STATUSES.OVERDUE] }
  });

  if (activeLoansCount >= plan.maximumBooks) {
    throw new ConflictError(
      `Borrowing limit reached. Member currently has ${activeLoansCount} active loan(s), which is the maximum allowed limit (${plan.maximumBooks}) for plan '${plan.name || 'STANDARD'}'.`,
      ERROR_CODES.BORROWING_LIMIT_REACHED
    );
  }

  // Check unpaid fines threshold
  if (member.outstandingFines > (plan.fineThreshold || 20)) {
    throw new ConflictError(
      `Borrowing blocked. Member has $${member.outstandingFines.toFixed(2)} in unpaid fines, exceeding the allowable threshold ($${plan.fineThreshold}).`,
      ERROR_CODES.UNPAID_FINES_BLOCKED
    );
  }

  // Check if member already has an active loan of this exact book
  const existingActiveLoan = await Transaction.findOne({
    memberId,
    bookId,
    status: { $in: [TRANSACTION_STATUSES.ACTIVE, TRANSACTION_STATUSES.OVERDUE] }
  });

  if (existingActiveLoan) {
    throw new ConflictError('Member already has an active borrowed copy of this book.', ERROR_CODES.DUPLICATE_LOAN);
  }

  // 2. Validate Book
  const book = await Book.findById(bookId);
  if (!book) {
    throw new NotFoundError('Book not found in catalog', ERROR_CODES.BOOK_NOT_FOUND);
  }

  if (book.status !== BOOK_STATUSES.AVAILABLE) {
    throw new ConflictError(`Book is not available for borrowing (Status: ${book.status}).`, ERROR_CODES.BOOK_UNAVAILABLE);
  }

  if (book.availableCopies <= 0) {
    throw new ConflictError('Book is currently out of stock. No copies are available to issue.', ERROR_CODES.BOOK_UNAVAILABLE);
  }

  // 3. Calculate Due Date
  const loanDays = plan.loanDurationDays || 14;
  const now = new Date();
  const dueDate = new Date(now.getTime() + loanDays * 24 * 60 * 60 * 1000);

  // 4. Update Inventory Atomically
  book.availableCopies -= 1;
  book.borrowCount += 1;
  await book.save();

  // 5. Create Transaction Record
  const transaction = await Transaction.create({
    bookId: book._id,
    memberId: member._id,
    issueDate: now,
    dueDate,
    status: TRANSACTION_STATUSES.ACTIVE,
    issuedBy,
    notes
  });

  // 6. Fulfill any existing Hold for this member and book
  await Hold.updateMany(
    {
      memberId: member._id,
      bookId: book._id,
      status: { $in: [HOLD_STATUSES.WAITING, HOLD_STATUSES.READY] }
    },
    {
      status: HOLD_STATUSES.FULFILLED,
      fulfilledAt: now
    }
  );

  // 7. Dispatch Notification
  await createNotification({
    memberId: member._id,
    transactionId: transaction._id,
    type: NOTIFICATION_TYPES.GENERAL,
    title: 'Book Issued Successfully',
    message: `You have successfully borrowed "${book.title}". Please return it by ${dueDate.toLocaleDateString()}.`
  });

  // 8. Audit Log
  await logAudit({
    actorId: issuedBy,
    action: 'BOOK_ISSUED',
    resource: 'Transaction',
    resourceId: transaction._id,
    metadata: {
      bookId: book._id,
      bookTitle: book.title,
      memberId: member._id,
      dueDate,
      remainingAvailableCopies: book.availableCopies
    },
    ipAddress
  });

  const populated = await Transaction.findById(transaction._id).populate('bookId memberId issuedBy');
  return populated;
};

/**
 * Return a borrowed book, calculate overdue fine, update inventory, and trigger reservation queue
 */
const returnBook = async ({ transactionId, returnedBy, condition = 'GOOD', notes = '', ipAddress = '' }) => {
  const transaction = await Transaction.findById(transactionId).populate('bookId memberId');
  if (!transaction) {
    throw new NotFoundError('Transaction not found', ERROR_CODES.NOT_FOUND);
  }

  if (![TRANSACTION_STATUSES.ACTIVE, TRANSACTION_STATUSES.OVERDUE].includes(transaction.status)) {
    throw new ConflictError(
      `Cannot return book. Transaction status is already '${transaction.status}'.`,
      ERROR_CODES.TRANSACTION_NOT_ACTIVE
    );
  }

  const book = await Book.findById(transaction.bookId._id);
  const member = await User.findById(transaction.memberId._id).populate('membershipPlanId');

  const returnDate = new Date();
  const finePerDay = (member && member.membershipPlanId) ? member.membershipPlanId.finePerDay : (Number(process.env.DEFAULT_FINE_PER_DAY) || 5);

  // Calculate Overdue Fine
  const { overdueDays, fine } = calculateOverdueFine(transaction.dueDate, returnDate, finePerDay);

  // Update Transaction
  transaction.returnDate = returnDate;
  transaction.fine = fine;
  transaction.fineStatus = fine > 0 ? FINE_STATUSES.UNPAID : FINE_STATUSES.PAID;
  transaction.status = condition === 'LOST' ? TRANSACTION_STATUSES.LOST : (condition === 'DAMAGED' ? TRANSACTION_STATUSES.DAMAGED : TRANSACTION_STATUSES.RETURNED);
  transaction.returnedBy = returnedBy;
  if (notes) {
    transaction.notes = transaction.notes ? `${transaction.notes} | ${notes}` : notes;
  }
  await transaction.save();

  // Update Book Inventory according to condition
  if (book) {
    if (condition === 'GOOD') {
      book.availableCopies = Math.min(book.totalCopies, book.availableCopies + 1);
    } else if (condition === 'DAMAGED') {
      book.damagedCopies += 1;
    } else if (condition === 'LOST') {
      book.lostCopies += 1;
    }
    await book.save();
  }

  // Refresh Member's outstanding fines in User record
  let currentTotalFines = 0;
  if (member) {
    currentTotalFines = await refreshMemberOutstandingFines(member._id);
  }

  // Auto-trigger Hold Queue if copy is available on shelf
  let triggeredHold = null;
  if (condition === 'GOOD' && book && book.availableCopies > 0) {
    triggeredHold = await processNextHoldOnBookReturn(book._id);
  }

  // Dispatch Return / Fine Notification
  if (fine > 0) {
    await createNotification({
      memberId: transaction.memberId._id,
      transactionId: transaction._id,
      type: NOTIFICATION_TYPES.FINE_CREATED,
      title: 'Book Returned with Overdue Fine',
      message: `"${book ? book.title : 'Book'}" was returned ${overdueDays} day(s) late. An overdue fine of $${fine.toFixed(2)} has been recorded.`
    });
  } else {
    await createNotification({
      memberId: transaction.memberId._id,
      transactionId: transaction._id,
      type: NOTIFICATION_TYPES.GENERAL,
      title: 'Book Returned Successfully',
      message: `Thank you! "${book ? book.title : 'Book'}" has been received in good condition.`
    });
  }

  // Audit Log
  await logAudit({
    actorId: returnedBy,
    action: 'BOOK_RETURNED',
    resource: 'Transaction',
    resourceId: transaction._id,
    metadata: {
      bookId: book ? book._id : null,
      memberId: transaction.memberId._id,
      overdueDays,
      fineAmount: fine,
      condition,
      availableCopies: book ? book.availableCopies : null,
      nextHoldTriggered: !!triggeredHold
    },
    ipAddress
  });

  return {
    transaction,
    overdueDays,
    fine,
    availableCopies: book ? book.availableCopies : 0,
    triggeredHold
  };
};

module.exports = {
  issueBook,
  returnBook
};
