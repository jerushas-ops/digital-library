const express = require('express');
const router = express.Router();
const {
  overdueReportHandler,
  mostBorrowedReportHandler,
  inventoryHealthReportHandler,
  finesReportHandler,
  memberStatsReportHandler,
  categoryReportHandler
} = require('../controllers/reportController');
const authenticateToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');
const { ROLES } = require('../constants');

router.use(authenticateToken);
router.use(authorizeRoles(ROLES.LIBRARIAN, ROLES.ADMIN));

router.get('/overdue', overdueReportHandler);
router.get('/most-borrowed', mostBorrowedReportHandler);
router.get('/inventory', inventoryHealthReportHandler);
router.get('/fines', finesReportHandler);
router.get('/members', memberStatsReportHandler);
router.get('/categories', categoryReportHandler);

module.exports = router;
