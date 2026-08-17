const express = require('express');
const router = express.Router();
const {
    createGroup,
    getMyGroups,
    getGroupMessages,
    updateGroup,
    addMembers,
    removeMember
} = require('../controllers/groupController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/create', authMiddleware, createGroup);
router.get('/my-groups', authMiddleware, getMyGroups);
router.get('/:groupId/messages', authMiddleware, getGroupMessages);

// New routes
router.put('/:groupId', authMiddleware, updateGroup);                    // Update name / avatar
router.post('/:groupId/members', authMiddleware, addMembers);            // Add multiple members
router.delete('/:groupId/members/:memberId', authMiddleware, removeMember); // Remove member

module.exports = router;