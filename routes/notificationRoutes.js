const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead
} = require('../controllers/notificationController');
const authenticateToken = require('../middleware/auth');
const validate = require('../middleware/validate');
const { validateMongoId } = require('../validators/bookValidator');

router.use(authenticateToken);

router.get('/', getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', validate(validateMongoId('id')), markAsRead);

module.exports = router;
