const express = require('express');
const router = express.Router();
const { getMessages, deleteMessage } = require('../controllers/messageController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/:friendId', authMiddleware, getMessages);
router.delete('/:messageId', authMiddleware, deleteMessage); // ✅ NEW

module.exports = router;