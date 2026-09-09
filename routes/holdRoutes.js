const express = require('express');
const router = express.Router();
const {
  placeHoldHandler,
  getHolds,
  cancelHoldHandler,
  getBookHoldQueue
} = require('../controllers/holdController');
const authenticateToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');
const validate = require('../middleware/validate');
const { validateCreateHold } = require('../validators/holdValidator');
const { validateMongoId } = require('../validators/bookValidator');
const { ROLES } = require('../constants');

router.use(authenticateToken);

router.get('/', getHolds);
router.post('/', validate(validateCreateHold), placeHoldHandler);
router.put('/:id/cancel', validate(validateMongoId('id')), cancelHoldHandler);
router.get(
  '/queue/:bookId',
  authorizeRoles(ROLES.LIBRARIAN, ROLES.ADMIN),
  validate(validateMongoId('bookId')),
  getBookHoldQueue
);

module.exports = router;
