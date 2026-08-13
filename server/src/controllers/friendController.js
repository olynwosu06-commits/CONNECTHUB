const FriendRequest = require('../models/FriendRequestModel');
const User = require('../models/UserModel');

// Send a friend request
const sendFriendRequest = async (req, res) => {
    try {
        const senderId = req.user.id;
        const { receiverId } = req.body;

        if (senderId === receiverId) {
            return res.status(400).json({ message: "You can't add yourself" });
        }

        const receiverExists = await User.findById(receiverId);
        if (!receiverExists) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if a request already exists in either direction
        const existing = await FriendRequest.findOne({
            $or: [
                { sender: senderId, receiver: receiverId },
                { sender: receiverId, receiver: senderId }
            ]
        });

        if (existing) {
            return res.status(400).json({ message: `Request already ${existing.status}` });
        }

        const request = await FriendRequest.create({ sender: senderId, receiver: receiverId });
        res.status(201).json({ message: "Friend request sent", request });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Accept a friend request
const acceptFriendRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { requestId } = req.params;

        const request = await FriendRequest.findById(requestId);

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (request.receiver.toString() !== userId) {
            return res.status(403).json({ message: "Not authorized to accept this request" });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ message: `Request already ${request.status}` });
        }

        request.status = 'accepted';
        await request.save();

        res.status(200).json({ message: "Friend request accepted", request });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Reject a friend request
const rejectFriendRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { requestId } = req.params;

        const request = await FriendRequest.findById(requestId);

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (request.receiver.toString() !== userId) {
            return res.status(403).json({ message: "Not authorized to reject this request" });
        }

        request.status = 'rejected';
        await request.save();

        res.status(200).json({ message: "Friend request rejected" });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get pending requests received by the logged-in user
const getPendingRequests = async (req, res) => {
    try {
        const userId = req.user.id;

        const requests = await FriendRequest.find({
            receiver: userId,
            status: 'pending'
        }).populate('sender', 'name email avatar online');

        res.status(200).json(requests);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get accepted friends list
const getFriends = async (req, res) => {
    try {
        const userId = req.user.id;

        const requests = await FriendRequest.find({
            status: 'accepted',
            $or: [{ sender: userId }, { receiver: userId }]
        }).populate('sender receiver', 'name email avatar online lastSeen');

        // Normalize so we return the OTHER person, not sender/receiver structure
        const friends = requests.map(r => {
            const friend = r.sender._id.toString() === userId ? r.receiver : r.sender;
            return friend;
        });

        res.status(200).json(friends);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ NEW: Remove/unfriend an accepted friend
const removeFriend = async (req, res) => {
    try {
        const userId = req.user.id;
        const { friendId } = req.params;

        // Find the accepted FriendRequest doc linking these two users, in either direction
        const request = await FriendRequest.findOneAndDelete({
            status: 'accepted',
            $or: [
                { sender: userId, receiver: friendId },
                { sender: friendId, receiver: userId }
            ]
        });

        if (!request) {
            return res.status(404).json({ message: "Friendship not found" });
        }

        res.status(200).json({ message: "Friend removed" });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get list of all users EXCLUDING self, existing friends, and pending requests (for "Add Friend" search)
const getDiscoverableUsers = async (req, res) => {
    try {
        const userId = req.user.id;

        const existingRequests = await FriendRequest.find({
            $or: [{ sender: userId }, { receiver: userId }]
        });

        const excludedIds = existingRequests.map(r =>
            r.sender.toString() === userId ? r.receiver.toString() : r.sender.toString()
        );
        excludedIds.push(userId);

        const users = await User.find({ _id: { $nin: excludedIds } }).select('-password');
        res.status(200).json(users);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getPendingRequests,
    getFriends,
    removeFriend,
    getDiscoverableUsers
};