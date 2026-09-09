const express = require('express');
const router = express.Router();
const {
  getInventorySummary,
  updateInventoryCondition
} = require('../controllers/inventoryController');
const authenticateToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');
const validate = require('../middleware/validate');
const { validateMongoId } = require('../validators/bookValidator');
const { ROLES } = require('../constants');

router.use(authenticateToken);
router.use(authorizeRoles(ROLES.LIBRARIAN, ROLES.ADMIN));

router.get('/', getInventorySummary);
router.put('/:bookId', validate(validateMongoId('bookId')), updateInventoryCondition);

module.exports = router;
