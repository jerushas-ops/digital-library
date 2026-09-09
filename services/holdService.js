const Hold = require('../models/Hold');
const Book = require('../models/Book');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { ConflictError, BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');
const { ERROR_CODES, HOLD_STATUSES, NOTIFICATION_TYPES, ROLES } = require('../constants');
const { createNotification } = require('./notificationService');
const { logAudit } = require('./auditService');

/**
 * Place a reservation hold on an unavailable book
 */
const placeHold = async ({ memberId, bookId, ipAddress = '' }) => {
  const member = await User.findById(memberId).populate('membershipPlanId');
  if (!member) {
    throw new NotFoundError('Member not found', ERROR_CODES.NOT_FOUND);
  }

  if (member.status !== 'ACTIVE') {
    throw new ForbiddenError('Inactive or suspended members cannot place reservation holds.', ERROR_CODES.ACCOUNT_INACTIVE);
  }

  const book = await Book.findById(bookId);
  if (!book) {
    throw new NotFoundError('Book not found', ERROR_CODES.BOOK_NOT_FOUND);
  }

  // Check if copies are currently available on shelf
  if (book.availableCopies > 0) {
    throw new ConflictError('Copies of this book are currently available on shelf. You can borrow it directly instead of placing a hold.', ERROR_CODES.CONFLICT);
  }

  // Check if member already has an active hold for this book
  const existingHold = await Hold.findOne({
    memberId,
    bookId,
    status: { $in: [HOLD_STATUSES.WAITING, HOLD_STATUSES.READY] }
  });

  if (existingHold) {
    throw new ConflictError('You already have an active reservation hold for this book.', ERROR_CODES.DUPLICATE_HOLD);
  }

  // Check if member already has this book currently borrowed
  const existingLoan = await Transaction.findOne({
    memberId,
    bookId,
    status: 'ACTIVE'
  });

  if (existingLoan) {
    throw new ConflictError('You already have an active loan for this book.', ERROR_CODES.DUPLICATE_LOAN);
  }

  // Check membership reservation limit
  const maxHolds = member.membershipPlanId ? member.membershipPlanId.reservationLimit : 3;
  const activeHoldsCount = await Hold.countDocuments({
    memberId,
    status: { $in: [HOLD_STATUSES.WAITING, HOLD_STATUSES.READY] }
  });

  if (activeHoldsCount >= maxHolds) {
    throw new ConflictError(`Reservation limit reached. Your plan allows a maximum of ${maxHolds} active holds.`, ERROR_CODES.HOLD_LIMIT_REACHED);
  }

  // Create Hold
  const hold = await Hold.create({
    memberId,
    bookId,
    status: HOLD_STATUSES.WAITING,
    requestedAt: new Date()
  });

  // Calculate position in queue
  const queuePosition = await Hold.countDocuments({
    bookId,
    status: HOLD_STATUSES.WAITING,
    requestedAt: { $lte: hold.requestedAt }
  });

  await logAudit({
    actorId: memberId,
    action: 'HOLD_PLACED',
    resource: 'Hold',
    resourceId: hold._id,
    metadata: { bookId, queuePosition },
    ipAddress
  });

  return {
    hold,
    queuePosition
  };
};

/**
 * Auto-trigger when a book copy is returned into inventory
 */
const processNextHoldOnBookReturn = async (bookId) => {
  try {
    const nextHold = await Hold.findOne({
      bookId,
      status: HOLD_STATUSES.WAITING
    })
      .sort({ requestedAt: 1 })
      .populate('memberId bookId');

    if (!nextHold) {
      return null;
    }

    const expirationHours = Number(process.env.HOLD_EXPIRATION_HOURS) || 48;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirationHours * 60 * 60 * 1000);

    nextHold.status = HOLD_STATUSES.READY;
    nextHold.readyAt = now;
    nextHold.expiresAt = expiresAt;
    await nextHold.save();

    // Notify member
    await createNotification({
      memberId: nextHold.memberId._id,
      holdId: nextHold._id,
      type: NOTIFICATION_TYPES.HOLD_READY,
      title: 'Reserved Book Ready for Pickup!',
      message: `Your reserved book "${nextHold.bookId.title}" is now available at the library desk. Please claim it before ${expiresAt.toLocaleString()}.`
    });

    await logAudit({
      actorId: null,
      action: 'HOLD_MARKED_READY',
      resource: 'Hold',
      resourceId: nextHold._id,
      metadata: { bookId, memberId: nextHold.memberId._id, expiresAt }
    });

    return nextHold;
  } catch (error) {
    console.error('[Hold Trigger Error]:', error.message);
    return null;
  }
};

/**
 * Cancel a reservation hold
 */
const cancelHold = async ({ holdId, userId, userRole, ipAddress = '' }) => {
  const hold = await Hold.findById(holdId).populate('bookId');
  if (!hold) {
    throw new NotFoundError('Reservation hold not found', ERROR_CODES.NOT_FOUND);
  }

  // Members can only cancel their own holds
  if (userRole === ROLES.MEMBER && hold.memberId.toString() !== userId.toString()) {
    throw new ForbiddenError('You can only cancel your own reservation holds', ERROR_CODES.FORBIDDEN);
  }

  if (![HOLD_STATUSES.WAITING, HOLD_STATUSES.READY].includes(hold.status)) {
    throw new ConflictError(`Cannot cancel hold with status '${hold.status}'`, ERROR_CODES.INVALID_STATE_TRANSITION);
  }

  hold.status = HOLD_STATUSES.CANCELLED;
  await hold.save();

  // If this hold was READY, check if there's another waiting hold to make READY
  if (hold.status === HOLD_STATUSES.READY) {
    await processNextHoldOnBookReturn(hold.bookId._id);
  }

  await logAudit({
    actorId: userId,
    action: 'HOLD_CANCELLED',
    resource: 'Hold',
    resourceId: hold._id,
    metadata: { bookId: hold.bookId._id },
    ipAddress
  });

  return hold;
};

module.exports = {
  placeHold,
  processNextHoldOnBookReturn,
  cancelHold
};
