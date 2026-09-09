const express = require('express');
const router = express.Router();
const {
  issueBookHandler,
  returnBookHandler,
  getTransactions,
  getTransactionById,
  getActiveLoans,
  getOverdueLoans
} = require('../controllers/transactionController');
const authenticateToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');
const validate = require('../middleware/validate');
const {
  validateIssueTransaction,
  validateReturnTransaction
} = require('../validators/transactionValidator');
const { validateMongoId } = require('../validators/bookValidator');
const { ROLES } = require('../constants');

// Apply authentication to all transaction routes
router.use(authenticateToken);

// Read transactions & loans
router.get('/', getTransactions);
router.get('/active', getActiveLoans);
router.get('/overdue', getOverdueLoans);
router.get('/:id', validate(validateMongoId('id')), getTransactionById);

// Issue workflow (Librarian & Admin)
router.post(
  '/issue',
  authorizeRoles(ROLES.LIBRARIAN, ROLES.ADMIN),
  validate(validateIssueTransaction),
  issueBookHandler
);

// Return workflow (Librarian & Admin)
router.put(
  '/:id/return',
  authorizeRoles(ROLES.LIBRARIAN, ROLES.ADMIN),
  validate(validateReturnTransaction),
  returnBookHandler
);

module.exports = router;
