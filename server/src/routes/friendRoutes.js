const express = require('express');
const router = express.Router();
const {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getPendingRequests,
    getFriends,
    removeFriend,
    getDiscoverableUsers
} = require('../controllers/friendController');
const { authMiddleware } = require('../middleware/authMiddleware'); // adjust path to match yours

router.post('/request', authMiddleware, sendFriendRequest);
router.put('/accept/:requestId', authMiddleware, acceptFriendRequest);
router.put('/reject/:requestId', authMiddleware, rejectFriendRequest);
router.get('/pending', authMiddleware, getPendingRequests);
router.get('/list', authMiddleware, getFriends);
router.delete('/remove/:friendId', authMiddleware, removeFriend); // ✅ NEW
router.get('/discover', authMiddleware, getDiscoverableUsers);

module.exports = router;