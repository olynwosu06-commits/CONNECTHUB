const Message = require('../models/MessageModel');

// ======================
// GET PRIVATE MESSAGES
// ======================
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
            .filter(msg => !msg.deletedFor.some(id => id.toString() === userId))
            .map(msg => ({
                _id: msg._id,
                senderId: msg.sender.toString(),
                text: msg.deletedForEveryone ? 'This message was deleted' : msg.text,
                image: msg.image || '',
                type: msg.type || 'text',
                edited: msg.edited || false,
                audio: msg.deletedForEveryone ? '' : msg.audio,
                deletedForEveryone: msg.deletedForEveryone,
                createdAt: msg.createdAt,
                time: new Date(msg.createdAt).toLocaleTimeString(),
                date: msg.createdAt, // ✅ NEW — raw date for building "Today"/"Yesterday" dividers
                read: msg.read,
                delivered: msg.delivered
            }));

        res.status(200).json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ======================
// DELETE MESSAGE
// ======================
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
            if (!isSender) {
                return res.status(403).json({ message: "Only the sender can delete for everyone" });
            }
            message.deletedForEveryone = true;
            await message.save();
            return res.status(200).json({ message: "Message deleted for everyone", deletedForEveryone: true });
        } else {
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

// ======================
// EDIT MESSAGE (NEW)
// ======================
const editMessage = async (req, res) => {
    try {
        const userId = req.user.id;
        const { messageId } = req.params;
        const { text } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ message: 'Text is required' });
        }

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        // Only the sender can edit
        if (message.sender.toString() !== userId) {
            return res.status(403).json({ message: 'You can only edit your own messages' });
        }

        // Don't allow editing system messages or deleted messages
        if (message.type === 'system' || message.deletedForEveryone) {
            return res.status(400).json({ message: 'This message cannot be edited' });
        }

        message.text = text.trim();
        message.edited = true;
        await message.save();

        res.status(200).json({
            message: 'Message updated',
            updatedMessage: {
                _id: message._id,
                text: message.text,
                edited: true
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getMessages, deleteMessage, editMessage };