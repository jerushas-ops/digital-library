const express = require('express');
const router = express.Router();
const {
  payFineHandler,
  waiveFineHandler,
  getFinePayments
} = require('../controllers/finePaymentController');
const authenticateToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');
const validate = require('../middleware/validate');
const { validateFinePayment } = require('../validators/fineValidator');
const { validateMongoId } = require('../validators/bookValidator');
const { ROLES } = require('../constants');

router.use(authenticateToken);

router.get('/', getFinePayments);
router.post('/', validate(validateFinePayment), payFineHandler);

// Waive fine (Librarian & Admin)
router.put(
  '/:id/waive',
  authorizeRoles(ROLES.LIBRARIAN, ROLES.ADMIN),
  validate(validateMongoId('id')),
  waiveFineHandler
);

module.exports = router;
