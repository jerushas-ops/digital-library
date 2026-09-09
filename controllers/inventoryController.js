const Book = require('../models/Book');
const Transaction = require('../models/Transaction');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');
const { NotFoundError, BadRequestError, ConflictError } = require('../utils/customErrors');
const { TRANSACTION_STATUSES, ERROR_CODES } = require('../constants');
const { logAudit } = require('../services/auditService');

/**
 * Get comprehensive inventory status
 * GET /api/inventory
 */
const getInventorySummary = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, category } = req.query;

    const filter = {};
    if (category) filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ title: regex }, { author: regex }, { isbn: regex }];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [books, total] = await Promise.all([
      Book.find(filter).sort({ title: 1 }).skip(skip).limit(limitNum),
      Book.countDocuments(filter)
    ]);

    // Enhance books with active loan count
    const enrichedItems = await Promise.all(
      books.map(async (b) => {
        const activeLoansCount = await Transaction.countDocuments({
          bookId: b._id,
          status: TRANSACTION_STATUSES.ACTIVE
        });

        return {
          _id: b._id,
          title: b.title,
          isbn: b.isbn,
          author: b.author,
          category: b.category,
          totalCopies: b.totalCopies,
          availableCopies: b.availableCopies,
          issuedCopies: activeLoansCount,
          lostCopies: b.lostCopies || 0,
          damagedCopies: b.damagedCopies || 0,
          status: b.status
        };
      })
    );

    // Global totals
    const allBooks = await Book.find();
    const globalActiveLoans = await Transaction.countDocuments({ status: TRANSACTION_STATUSES.ACTIVE });

    const summary = allBooks.reduce(
      (acc, b) => {
        acc.totalCopies += b.totalCopies;
        acc.availableCopies += b.availableCopies;
        acc.lostCopies += b.lostCopies || 0;
        acc.damagedCopies += b.damagedCopies || 0;
        return acc;
      },
      {
        totalTitles: allBooks.length,
        totalCopies: 0,
        availableCopies: 0,
        issuedCopies: globalActiveLoans,
        lostCopies: 0,
        damagedCopies: 0
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Inventory report retrieved successfully',
      data: {
        summary,
        items: enrichedItems,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update inventory copy counts and conditions
 * PUT /api/inventory/:bookId
 */
const updateInventoryCondition = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) {
      throw new NotFoundError('Book not found in inventory', ERROR_CODES.BOOK_NOT_FOUND);
    }

    const { totalCopies, availableCopies, lostCopies, damagedCopies } = req.body;

    const activeLoans = await Transaction.countDocuments({
      bookId: book._id,
      status: TRANSACTION_STATUSES.ACTIVE
    });

    let newTotal = totalCopies !== undefined ? Number(totalCopies) : book.totalCopies;
    let newAvail = availableCopies !== undefined ? Number(availableCopies) : book.availableCopies;
    let newLost = lostCopies !== undefined ? Number(lostCopies) : book.lostCopies;
    let newDamaged = damagedCopies !== undefined ? Number(damagedCopies) : book.damagedCopies;

    if (newTotal < 1) throw new BadRequestError('Total copies must be at least 1');
    if (newAvail < 0 || newLost < 0 || newDamaged < 0) {
      throw new BadRequestError('Copy counts cannot be negative');
    }

    if (newAvail > newTotal) {
      throw new BadRequestError('Available copies cannot exceed total copies.');
    }

    if (newAvail + activeLoans + newLost + newDamaged > newTotal) {
      throw new ConflictError(
        `Total copy breakdown (${newAvail} avail + ${activeLoans} issued + ${newLost} lost + ${newDamaged} damaged = ${newAvail + activeLoans + newLost + newDamaged}) exceeds total copies of ${newTotal}.`
      );
    }

    book.totalCopies = newTotal;
    book.availableCopies = newAvail;
    book.lostCopies = newLost;
    book.damagedCopies = newDamaged;

    await book.save();

    await logAudit({
      actorId: req.user._id,
      action: 'INVENTORY_ADJUSTED',
      resource: 'Book',
      resourceId: book._id,
      metadata: {
        totalCopies: newTotal,
        availableCopies: newAvail,
        lostCopies: newLost,
        damagedCopies: newDamaged
      },
      ipAddress: req.ip
    });

    return successResponse(res, 'Inventory copy counts adjusted successfully', {
      book,
      issuedCopies: activeLoans
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInventorySummary,
  updateInventoryCondition
};
