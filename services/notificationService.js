const Notification = require('../models/Notification');
const { NOTIFICATION_TYPES } = require('../constants');

/**
 * Notification Dispatching Service
 */
const createNotification = async ({
  memberId,
  transactionId = null,
  holdId = null,
  type = NOTIFICATION_TYPES.GENERAL,
  title,
  message
}) => {
  try {
    const notification = await Notification.create({
      memberId,
      transactionId,
      holdId,
      type,
      title,
      message,
      isRead: false,
      createdAt: new Date()
    });
    return notification;
  } catch (error) {
    console.error('[Notification Error]: Failed to create notification:', error.message);
    return null;
  }
};

/**
 * Scan active loans and automatically dispatch overdue & due soon alerts
 */
const scanAndCreateLoanNotifications = async () => {
  const Transaction = require('../models/Transaction');
  const now = new Date();
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  try {
    // 1. Due Soon loans (due within 48 hours and active)
    const dueSoonLoans = await Transaction.find({
      status: 'ACTIVE',
      dueDate: { $gte: now, $lte: twoDaysFromNow }
    }).populate('bookId memberId');

    for (const loan of dueSoonLoans) {
      if (loan.memberId && loan.bookId) {
        // Prevent duplicate notification today
        const existingNotif = await Notification.findOne({
          memberId: loan.memberId._id,
          transactionId: loan._id,
          type: NOTIFICATION_TYPES.DUE_SOON,
          createdAt: { $gte: new Date(now.setHours(0, 0, 0, 0)) }
        });

        if (!existingNotif) {
          await createNotification({
            memberId: loan.memberId._id,
            transactionId: loan._id,
            type: NOTIFICATION_TYPES.DUE_SOON,
            title: 'Book Due Soon',
            message: `Your borrowed book "${loan.bookId.title}" is due on ${new Date(loan.dueDate).toLocaleDateString()}. Please return or renew it to avoid overdue fines.`
          });
        }
      }
    }

    // 2. Overdue loans
    const overdueLoans = await Transaction.find({
      status: 'ACTIVE',
      dueDate: { $lt: new Date() }
    }).populate('bookId memberId');

    for (const loan of overdueLoans) {
      if (loan.memberId && loan.bookId) {
        const existingNotif = await Notification.findOne({
          memberId: loan.memberId._id,
          transactionId: loan._id,
          type: NOTIFICATION_TYPES.OVERDUE,
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });

        if (!existingNotif) {
          await createNotification({
            memberId: loan.memberId._id,
            transactionId: loan._id,
            type: NOTIFICATION_TYPES.OVERDUE,
            title: 'Book is Overdue!',
            message: `Your loan for "${loan.bookId.title}" was due on ${new Date(loan.dueDate).toLocaleDateString()}. Fines are accumulating daily. Please return it immediately.`
          });
        }
      }
    }
  } catch (error) {
    console.error('[Notification Scanner Error]:', error.message);
  }
};

module.exports = {
  createNotification,
  scanAndCreateLoanNotifications
};
