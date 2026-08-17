const Notification = require('../models/notificationModel');

// ✅ Reusable helper — call this from anywhere (friendController, groupController)
// whenever an action should create a notification for someone.
const createNotification = async ({ recipient, type, message, fromUser, groupId }) => {
    try {
        await Notification.create({ recipient, type, message, fromUser, groupId });
    } catch (error) {
        console.error('Error creating notification:', error.message);
    }
};

const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .populate('fromUser', 'name avatar')
            .populate('groupId', 'name')
            .sort({ createdAt: -1 })
            .limit(50);
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({ recipient: req.user.id, read: false });
        res.status(200).json({ count });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const markAsRead = async (req, res) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user.id },
            { read: true }
        );
        res.status(200).json({ message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany({ recipient: req.user.id, read: false }, { read: true });
        res.status(200).json({ message: 'All marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createNotification, getNotifications, getUnreadCount, markAsRead, markAllAsRead };