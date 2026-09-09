const Book = require('../models/Book');
const Transaction = require('../models/Transaction');
const Hold = require('../models/Hold');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/customErrors');
const { BOOK_STATUSES, TRANSACTION_STATUSES, ERROR_CODES } = require('../constants');
const { logAudit } = require('../services/auditService');

/**
 * Create a new book
 * POST /api/books
 */
const createBook = async (req, res, next) => {
  try {
    const {
      title,
      author,
      isbn,
      category,
      description,
      publisher,
      publicationYear,
      totalCopies,
      availableCopies,
      coverImage,
      status = BOOK_STATUSES.AVAILABLE
    } = req.body;

    const normalizedIsbn = isbn.toUpperCase().trim();

    const existingBook = await Book.findOne({ isbn: normalizedIsbn });
    if (existingBook) {
      throw new ConflictError(`A book with ISBN '${normalizedIsbn}' already exists in the catalog.`, ERROR_CODES.CONFLICT);
    }

    const total = Number(totalCopies);
    const available = availableCopies !== undefined ? Number(availableCopies) : total;

    if (available > total) {
      throw new BadRequestError('Available copies cannot exceed total copies.');
    }

    const book = await Book.create({
      title: title.trim(),
      author: author.trim(),
      isbn: normalizedIsbn,
      category: category.trim(),
      description: description ? description.trim() : '',
      publisher: publisher ? publisher.trim() : '',
      publicationYear: publicationYear ? Number(publicationYear) : undefined,
      totalCopies: total,
      availableCopies: available,
      coverImage: coverImage ? coverImage.trim() : '',
      status
    });

    await logAudit({
      actorId: req.user._id,
      action: 'BOOK_CREATED',
      resource: 'Book',
      resourceId: book._id,
      metadata: { title: book.title, isbn: book.isbn, totalCopies: book.totalCopies },
      ipAddress: req.ip
    });

    return successResponse(res, 'Book created successfully', { book }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all books with filtering and pagination
 * GET /api/books
 */
const getBooks = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      status,
      available,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};

    if (category) {
      filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    if (status) {
      filter.status = status;
    }

    if (available === 'true') {
      filter.availableCopies = { $gt: 0 };
      filter.status = BOOK_STATUSES.AVAILABLE;
    } else if (available === 'false') {
      filter.availableCopies = { $lte: 0 };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [books, total] = await Promise.all([
      Book.find(filter).sort(sortOptions).skip(skip).limit(limitNum),
      Book.countDocuments(filter)
    ]);

    return paginatedResponse(res, 'Books retrieved successfully', books, total, pageNum, limitNum);
  } catch (error) {
    next(error);
  }
};

/**
 * Search books by query
 * GET /api/books/search
 */
const searchBooks = async (req, res, next) => {
  try {
    const {
      q,
      title,
      author,
      isbn,
      category,
      available,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};

    if (q && q.trim() !== '') {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { title: regex },
        { author: regex },
        { isbn: regex },
        { category: regex },
        { publisher: regex }
      ];
    }

    if (title) filter.title = { $regex: new RegExp(title.trim(), 'i') };
    if (author) filter.author = { $regex: new RegExp(author.trim(), 'i') };
    if (isbn) filter.isbn = { $regex: new RegExp(isbn.trim(), 'i') };
    if (category) filter.category = { $regex: new RegExp(category.trim(), 'i') };

    if (available === 'true') {
      filter.availableCopies = { $gt: 0 };
      filter.status = BOOK_STATUSES.AVAILABLE;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [books, total] = await Promise.all([
      Book.find(filter).sort(sortOptions).skip(skip).limit(limitNum),
      Book.countDocuments(filter)
    ]);

    return paginatedResponse(res, 'Search results retrieved successfully', books, total, pageNum, limitNum);
  } catch (error) {
    next(error);
  }
};

/**
 * Get book by ID
 * GET /api/books/:id
 */
const getBookById = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      throw new NotFoundError('Book not found', ERROR_CODES.BOOK_NOT_FOUND);
    }

    // Include additional active loan & hold statistics
    const [activeLoansCount, waitingHoldsCount] = await Promise.all([
      Transaction.countDocuments({ bookId: book._id, status: TRANSACTION_STATUSES.ACTIVE }),
      Hold.countDocuments({ bookId: book._id, status: 'WAITING' })
    ]);

    return successResponse(res, 'Book details retrieved successfully', {
      book,
      stats: {
        activeLoansCount,
        waitingHoldsCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update book details
 * PUT /api/books/:id
 */
const updateBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      throw new NotFoundError('Book not found', ERROR_CODES.BOOK_NOT_FOUND);
    }

    const {
      title,
      author,
      isbn,
      category,
      description,
      publisher,
      publicationYear,
      totalCopies,
      availableCopies,
      coverImage,
      status
    } = req.body;

    if (isbn && isbn.toUpperCase().trim() !== book.isbn) {
      const isbnExists = await Book.findOne({ isbn: isbn.toUpperCase().trim() });
      if (isbnExists) {
        throw new ConflictError(`ISBN '${isbn}' is already used by another book.`);
      }
      book.isbn = isbn.toUpperCase().trim();
    }

    if (title) book.title = title.trim();
    if (author) book.author = author.trim();
    if (category) book.category = category.trim();
    if (description !== undefined) book.description = description.trim();
    if (publisher !== undefined) book.publisher = publisher.trim();
    if (publicationYear !== undefined) book.publicationYear = Number(publicationYear);
    if (coverImage !== undefined) book.coverImage = coverImage.trim();
    if (status) book.status = status;

    if (totalCopies !== undefined) {
      const newTotal = Number(totalCopies);
      const activeLoans = await Transaction.countDocuments({ bookId: book._id, status: TRANSACTION_STATUSES.ACTIVE });
      if (newTotal < activeLoans) {
        throw new ConflictError(
          `Cannot reduce total copies to ${newTotal}. There are currently ${activeLoans} active loans for this book.`
        );
      }
      book.totalCopies = newTotal;
    }

    if (availableCopies !== undefined) {
      const newAvail = Number(availableCopies);
      if (newAvail > book.totalCopies) {
        throw new BadRequestError('Available copies cannot exceed total copies.');
      }
      book.availableCopies = newAvail;
    }

    await book.save();

    await logAudit({
      actorId: req.user._id,
      action: 'BOOK_UPDATED',
      resource: 'Book',
      resourceId: book._id,
      metadata: { title: book.title },
      ipAddress: req.ip
    });

    return successResponse(res, 'Book updated successfully', { book });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete or Archive book
 * DELETE /api/books/:id
 */
const deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      throw new NotFoundError('Book not found', ERROR_CODES.BOOK_NOT_FOUND);
    }

    // Check if book has active loans
    const activeLoans = await Transaction.countDocuments({
      bookId: book._id,
      status: { $in: [TRANSACTION_STATUSES.ACTIVE, TRANSACTION_STATUSES.OVERDUE] }
    });

    if (activeLoans > 0) {
      throw new ConflictError(
        `Cannot delete book. There are currently ${activeLoans} active borrowing transaction(s) associated with this book.`,
        ERROR_CODES.CANNOT_DELETE_ACTIVE_BOOK
      );
    }

    // Check if book has historical transactions
    const totalTransactions = await Transaction.countDocuments({ bookId: book._id });

    if (totalTransactions > 0) {
      // Soft-delete / Archive to preserve borrowing history integrity
      book.status = BOOK_STATUSES.ARCHIVED;
      book.availableCopies = 0;
      await book.save();

      await logAudit({
        actorId: req.user._id,
        action: 'BOOK_ARCHIVED',
        resource: 'Book',
        resourceId: book._id,
        metadata: { title: book.title, reason: 'Preserved due to existing transaction history' },
        ipAddress: req.ip
      });

      return successResponse(res, 'Book has historical loans and was safely ARCHIVED instead of hard-deleted.', { book });
    } else {
      // Hard delete if no transactions ever occurred
      await Book.findByIdAndDelete(book._id);

      await logAudit({
        actorId: req.user._id,
        action: 'BOOK_DELETED',
        resource: 'Book',
        resourceId: book._id,
        metadata: { title: book.title },
        ipAddress: req.ip
      });

      return successResponse(res, 'Book permanently deleted from catalog.');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBook,
  getBooks,
  searchBooks,
  getBookById,
  updateBook,
  deleteBook
};
