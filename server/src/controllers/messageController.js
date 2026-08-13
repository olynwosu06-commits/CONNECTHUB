const Message = require('../models/MessageModel');

const getMessages = async (req, res) => {
    try {
        const userId = req.user.id;
        const { friendId } = req.params;

        const messages = await Message.find({
            $or: [
                { sender: userId, receiver: friendId },
                { sender: friendId, receiver: userId }
            ]
        }).sort({ createdAt: 1 });

        const formatted = messages
            // ✅ Hide messages this user deleted "for me"
            .filter(msg => !msg.deletedFor.some(id => id.toString() === userId))
            .map(msg => ({
                _id: msg._id, // ✅ needed so the frontend can target a specific message to delete
                senderId: msg.sender.toString(),
                // ✅ Show placeholder text if deleted for everyone, like WhatsApp
                text: msg.deletedForEveryone ? 'This message was deleted' : msg.text,
                deletedForEveryone: msg.deletedForEveryone,
                time: new Date(msg.createdAt).toLocaleTimeString(),
                read: msg.read,
                delivered: msg.delivered
            }));

        res.status(200).json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ NEW: delete a message, either "for me" or "for everyone"
const deleteMessage = async (req, res) => {
    try {
        const userId = req.user.id;
        const { messageId } = req.params;
        const { forEveryone } = req.body;

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        const isSender = message.sender.toString() === userId;
        const isReceiver = message.receiver && message.receiver.toString() === userId;

        if (!isSender && !isReceiver) {
            return res.status(403).json({ message: "Not authorized to delete this message" });
        }

        if (forEveryone) {
            // Only the original sender can delete for everyone
            if (!isSender) {
                return res.status(403).json({ message: "Only the sender can delete for everyone" });
            }
            message.deletedForEveryone = true;
            await message.save();
            return res.status(200).json({ message: "Message deleted for everyone", deletedForEveryone: true });
        } else {
            // Delete for me: add this user to deletedFor if not already there
            if (!message.deletedFor.some(id => id.toString() === userId)) {
                message.deletedFor.push(userId);
                await message.save();
            }
            return res.status(200).json({ message: "Message deleted for you" });
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getMessages, deleteMessage };