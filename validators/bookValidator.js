const mongoose = require('mongoose');
const { BOOK_STATUSES } = require('../constants');

const validateCreateBook = (req) => {
  const errors = [];
  const { title, author, isbn, category, totalCopies, availableCopies, publicationYear, status } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Book title is required' });
  }

  if (!author || typeof author !== 'string' || author.trim().length === 0) {
    errors.push({ field: 'author', message: 'Author name is required' });
  }

  if (!isbn || typeof isbn !== 'string' || isbn.trim().length === 0) {
    errors.push({ field: 'isbn', message: 'ISBN is required' });
  }

  if (!category || typeof category !== 'string' || category.trim().length === 0) {
    errors.push({ field: 'category', message: 'Category is required' });
  }

  if (totalCopies === undefined || typeof Number(totalCopies) !== 'number' || isNaN(Number(totalCopies)) || Number(totalCopies) < 1) {
    errors.push({ field: 'totalCopies', message: 'Total copies must be a positive integer greater than or equal to 1' });
  }

  if (availableCopies !== undefined) {
    const avail = Number(availableCopies);
    if (isNaN(avail) || avail < 0) {
      errors.push({ field: 'availableCopies', message: 'Available copies cannot be negative' });
    } else if (Number(totalCopies) && avail > Number(totalCopies)) {
      errors.push({ field: 'availableCopies', message: 'Available copies cannot exceed total copies' });
    }
  }

  if (publicationYear !== undefined && publicationYear !== '') {
    const year = Number(publicationYear);
    if (isNaN(year) || year < 1000 || year > new Date().getFullYear() + 1) {
      errors.push({ field: 'publicationYear', message: 'Publication year is invalid' });
    }
  }

  if (status && !Object.values(BOOK_STATUSES).includes(status)) {
    errors.push({ field: 'status', message: `Invalid status. Allowed: ${Object.values(BOOK_STATUSES).join(', ')}` });
  }

  return errors;
};

const validateUpdateBook = (req) => {
  const errors = [];
  const { totalCopies, availableCopies, status, publicationYear } = req.body;

  if (totalCopies !== undefined) {
    const total = Number(totalCopies);
    if (isNaN(total) || total < 1) {
      errors.push({ field: 'totalCopies', message: 'Total copies must be at least 1' });
    }
  }

  if (availableCopies !== undefined) {
    const avail = Number(availableCopies);
    if (isNaN(avail) || avail < 0) {
      errors.push({ field: 'availableCopies', message: 'Available copies cannot be negative' });
    }
  }

  if (publicationYear !== undefined && publicationYear !== '') {
    const year = Number(publicationYear);
    if (isNaN(year) || year < 1000 || year > new Date().getFullYear() + 1) {
      errors.push({ field: 'publicationYear', message: 'Publication year is invalid' });
    }
  }

  if (status && !Object.values(BOOK_STATUSES).includes(status)) {
    errors.push({ field: 'status', message: `Invalid status. Allowed: ${Object.values(BOOK_STATUSES).join(', ')}` });
  }

  return errors;
};

const validateMongoId = (paramName = 'id') => {
  return (req) => {
    const errors = [];
    const id = req.params[paramName];
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      errors.push({ field: paramName, message: `Invalid ${paramName} format. Must be a 24-character hexadecimal ObjectId.` });
    }
    return errors;
  };
};

module.exports = {
  validateCreateBook,
  validateUpdateBook,
  validateMongoId
};
