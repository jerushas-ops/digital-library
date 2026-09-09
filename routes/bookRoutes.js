const express = require('express');
const router = express.Router();
const {
  createBook,
  getBooks,
  searchBooks,
  getBookById,
  updateBook,
  deleteBook
} = require('../controllers/bookController');
const authenticateToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');
const validate = require('../middleware/validate');
const {
  validateCreateBook,
  validateUpdateBook,
  validateMongoId
} = require('../validators/bookValidator');
const { ROLES } = require('../constants');

// Public catalog search & retrieval
router.get('/', getBooks);
router.get('/search', searchBooks);
router.get('/:id', validate(validateMongoId('id')), getBookById);

// Protected Librarian / Admin catalog management
router.post(
  '/',
  authenticateToken,
  authorizeRoles(ROLES.LIBRARIAN, ROLES.ADMIN),
  validate(validateCreateBook),
  createBook
);

router.put(
  '/:id',
  authenticateToken,
  authorizeRoles(ROLES.LIBRARIAN, ROLES.ADMIN),
  validate(validateMongoId('id')),
  validate(validateUpdateBook),
  updateBook
);

router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles(ROLES.LIBRARIAN, ROLES.ADMIN),
  validate(validateMongoId('id')),
  deleteBook
);

module.exports = router;
