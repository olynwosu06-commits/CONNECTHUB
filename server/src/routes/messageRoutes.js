const express = require('express');
const router = express.Router();
const { getMessages, deleteMessage, editMessage } = require('../controllers/messageController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/:friendId', authMiddleware, getMessages);
router.delete('/:messageId', authMiddleware, deleteMessage);
router.put('/:messageId', authMiddleware, editMessage);   // ← NEW: Edit message

module.exports = router;