const Transaction = require('../models/Transaction');
const Book = require('../models/Book');
const User = require('../models/User');
const FinePayment = require('../models/FinePayment');
const Hold = require('../models/Hold');
const { TRANSACTION_STATUSES, FINE_STATUSES, ROLES } = require('../constants');

/**
 * Analytical Report Service using MongoDB Aggregation Pipelines
 */

const getOverdueReport = async () => {
  const now = new Date();

  const overdueLoans = await Transaction.aggregate([
    {
      $match: {
        status: { $in: [TRANSACTION_STATUSES.ACTIVE, TRANSACTION_STATUSES.OVERDUE] },
        dueDate: { $lt: now }
      }
    },
    {
      $lookup: {
        from: 'books',
        localField: 'bookId',
        foreignField: '_id',
        as: 'book'
      }
    },
    {
      $unwind: '$book'
    },
    {
      $lookup: {
        from: 'users',
        localField: 'memberId',
        foreignField: '_id',
        as: 'member'
      }
    },
    {
      $unwind: '$member'
    },
    {
      $addFields: {
        overdueDays: {
          $ceil: {
            $divide: [{ $subtract: [now, '$dueDate'] }, 1000 * 60 * 60 * 24]
          }
        }
      }
    },
    {
      $project: {
        _id: 1,
        issueDate: 1,
        dueDate: 1,
        overdueDays: 1,
        'book._id': 1,
        'book.title': 1,
        'book.isbn': 1,
        'book.author': 1,
        'member._id': 1,
        'member.name': 1,
        'member.email': 1,
        'member.membershipId': 1,
        'member.phone': 1
      }
    },
    {
      $sort: { overdueDays: -1 }
    }
  ]);

  return overdueLoans;
};

const getMostBorrowedReport = async (limit = 10) => {
  const mostBorrowed = await Transaction.aggregate([
    {
      $group: {
        _id: '$bookId',
        borrowCount: { $sum: 1 },
        activeBorrowCount: {
          $sum: {
            $cond: [{ $eq: ['$status', TRANSACTION_STATUSES.ACTIVE] }, 1, 0]
          }
        }
      }
    },
    {
      $sort: { borrowCount: -1 }
    },
    {
      $limit: Number(limit)
    },
    {
      $lookup: {
        from: 'books',
        localField: '_id',
        foreignField: '_id',
        as: 'book'
      }
    },
    {
      $unwind: '$book'
    },
    {
      $project: {
        _id: '$book._id',
        title: '$book.title',
        author: '$book.author',
        isbn: '$book.isbn',
        category: '$book.category',
        totalCopies: '$book.totalCopies',
        availableCopies: '$book.availableCopies',
        borrowCount: 1,
        activeBorrowCount: 1
      }
    }
  ]);

  return mostBorrowed;
};

const getInventoryHealthReport = async () => {
  const inventoryStats = await Book.aggregate([
    {
      $group: {
        _id: null,
        totalTitles: { $sum: 1 },
        totalCopies: { $sum: '$totalCopies' },
        availableCopies: { $sum: '$availableCopies' },
        lostCopies: { $sum: '$lostCopies' },
        damagedCopies: { $sum: '$damagedCopies' }
      }
    }
  ]);

  const stats = inventoryStats[0] || {
    totalTitles: 0,
    totalCopies: 0,
    availableCopies: 0,
    lostCopies: 0,
    damagedCopies: 0
  };

  const activeLoansCount = await Transaction.countDocuments({ status: TRANSACTION_STATUSES.ACTIVE });
  const pendingHoldsCount = await Hold.countDocuments({ status: 'WAITING' });

  return {
    ...stats,
    issuedCopies: activeLoansCount,
    pendingHolds: pendingHoldsCount,
    utilizationRate: stats.totalCopies > 0 ? ((activeLoansCount / stats.totalCopies) * 100).toFixed(2) + '%' : '0%'
  };
};

const getFineSummaryReport = async () => {
  const finesAgg = await Transaction.aggregate([
    {
      $group: {
        _id: null,
        totalFinesAccrued: { $sum: '$fine' },
        totalFinesPaidOnTransactions: { $sum: '$finePaid' }
      }
    }
  ]);

  const paymentsAgg = await FinePayment.aggregate([
    {
      $group: {
        _id: '$status',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  const finesData = finesAgg[0] || { totalFinesAccrued: 0, totalFinesPaidOnTransactions: 0 };
  let totalPaidCollected = 0;
  let totalWaived = 0;

  paymentsAgg.forEach((item) => {
    if (item._id === FINE_STATUSES.PAID) totalPaidCollected = item.totalAmount;
    if (item._id === FINE_STATUSES.WAIVED) totalWaived = item.totalAmount;
  });

  const totalOutstanding = Math.max(0, finesData.totalFinesAccrued - totalPaidCollected - totalWaived);

  return {
    totalFinesAccrued: finesData.totalFinesAccrued,
    totalPaidCollected,
    totalWaived,
    totalOutstanding
  };
};

const getMemberStatsReport = async () => {
  const memberStats = await User.aggregate([
    {
      $match: { role: ROLES.MEMBER }
    },
    {
      $lookup: {
        from: 'transactions',
        localField: '_id',
        foreignField: 'memberId',
        as: 'transactions'
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        membershipId: 1,
        memberType: 1,
        status: 1,
        outstandingFines: 1,
        totalBorrowCount: { $size: '$transactions' },
        activeLoanCount: {
          $size: {
            $filter: {
              input: '$transactions',
              as: 'tx',
              cond: { $eq: ['$$tx.status', TRANSACTION_STATUSES.ACTIVE] }
            }
          }
        }
      }
    },
    {
      $sort: { totalBorrowCount: -1 }
    }
  ]);

  return memberStats;
};

const getCategoryBorrowingReport = async () => {
  const categoryStats = await Transaction.aggregate([
    {
      $lookup: {
        from: 'books',
        localField: 'bookId',
        foreignField: '_id',
        as: 'book'
      }
    },
    {
      $unwind: '$book'
    },
    {
      $group: {
        _id: '$book.category',
        totalBorrows: { $sum: 1 }
      }
    },
    {
      $project: {
        category: '$_id',
        totalBorrows: 1,
        _id: 0
      }
    },
    {
      $sort: { totalBorrows: -1 }
    }
  ]);

  return categoryStats;
};

module.exports = {
  getOverdueReport,
  getMostBorrowedReport,
  getInventoryHealthReport,
  getFineSummaryReport,
  getMemberStatsReport,
  getCategoryBorrowingReport
};
