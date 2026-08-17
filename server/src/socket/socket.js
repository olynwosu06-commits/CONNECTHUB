const jwt = require('jsonwebtoken');
const Message = require('../models/MessageModel');
const User = require('../models/UserModel');
const Group = require('../models/GroupModel');

let onlineUsers = [];

const socketIO = (io) => {
    // Auth middleware
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) return next(new Error('Authentication error: no token provided'));

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            next();
        } catch (error) {
            next(new Error('Authentication error: invalid token'));
        }
    });

    io.on('connection', async (socket) => {
        console.log('🔗 New user connected:', socket.id, '| userId:', socket.userId);

        onlineUsers.push({ userId: socket.userId, socketId: socket.id });

        try {
            await User.findByIdAndUpdate(socket.userId, { online: true });
        } catch (error) {
            console.error('Error setting user online:', error.message);
        }

        io.emit('online-users', onlineUsers);

        // ==========================================
        // PRIVATE MESSAGE
        // ==========================================
        socket.on('private-message', async (data) => {
            try {
                const { receiverId, text, image, audio } = data;
                // ✅ FIX: was missing "&& !audio" — voice-only messages were being silently dropped
                if (!receiverId || (!text && !image && !audio)) return;

                const message = await Message.create({
                    sender: socket.userId,
                    receiver: receiverId,
                    text: text || '',
                    image: image || '',
                    audio: audio || '',
                    type: audio ? 'audio' : image ? 'image' : 'text',
                    read: false,
                    delivered: false
                });

                const receivers = onlineUsers.filter(u => u.userId === receiverId);

                if (receivers.length > 0) {
                    await Message.findByIdAndUpdate(message._id, { delivered: true });
                    message.delivered = true;
                }

                receivers.forEach(receiver => {
                    io.to(receiver.socketId).emit('new-message', {
                        ...message.toObject(),
                        sender: socket.userId
                    });
                });

                socket.emit('message-sent', {
                    ...message.toObject(),
                    delivered: receivers.length > 0
                });

            } catch (error) {
                console.error('Error sending private message:', error.message);
                socket.emit('error-message', { message: 'Failed to send message' });
            }
        });

        // ==========================================
        // MARK AS READ
        // ==========================================
        socket.on('mark-read', async (data) => {
            try {
                const { senderId } = data;

                await Message.updateMany(
                    { sender: senderId, receiver: socket.userId, read: false },
                    { read: true }
                );

                const senderSockets = onlineUsers.filter(u => u.userId === senderId);
                senderSockets.forEach(s => {
                    io.to(s.socketId).emit('messages-read', {
                        by: socket.userId,
                        from: senderId
                    });
                });

            } catch (error) {
                console.error('Error marking read:', error.message);
            }
        });

        // ==========================================
        // JOIN GROUP
        // ==========================================
        socket.on('join-group', async (groupId) => {
            try {
                const group = await Group.findById(groupId);

                if (!group || !group.members.includes(socket.userId)) {
                    return socket.emit('error-message', { message: 'Not authorized to join this group' });
                }

                socket.join(groupId);
                console.log(`User ${socket.userId} joined group ${groupId}`);
            } catch (error) {
                console.error('Error joining group:', error.message);
            }
        });

        // ==========================================
        // GROUP MESSAGE
        // ==========================================
        socket.on('group-message', async (data) => {
            try {
                const { groupId, text, image } = data;

                if (!groupId || (!text && !image)) {
                    return socket.emit('error-message', { message: 'groupId and text/image are required' });
                }

                const group = await Group.findById(groupId);
                if (!group || !group.members.includes(socket.userId)) {
                    return socket.emit('error-message', { message: 'Not authorized to message this group' });
                }

                const message = await Message.create({
                    sender: socket.userId,
                    groupId,
                    text: text || '',
                    image: image || '',
                    type: image ? 'image' : 'text',
                    read: false
                });

                // Update last message on group
                group.lastMessage = text || '📷 Photo';
                group.lastMessageTime = new Date();
                await group.save();

                io.to(groupId).emit('new-group-message', {
                    ...message.toObject(),
                    sender: socket.userId,
                    senderName: (await User.findById(socket.userId).select('name')).name
                });

            } catch (error) {
                console.error('Error sending group message:', error.message);
                socket.emit('error-message', { message: 'Failed to send group message' });
            }
        });

        // ==========================================
        // EDIT MESSAGE
        // ==========================================
        socket.on('edit-message', async (data) => {
            try {
                const { messageId, text, groupId } = data;

                if (!messageId || !text?.trim()) return;

                const message = await Message.findById(messageId);
                if (!message) return;

                if (message.sender.toString() !== socket.userId) {
                    return socket.emit('error-message', { message: 'You can only edit your own messages' });
                }

                message.text = text.trim();
                message.edited = true;
                await message.save();

                const payload = {
                    _id: message._id,
                    text: message.text,
                    edited: true
                };

                if (groupId) {
                    io.to(groupId).emit('message-edited', payload);
                } else if (message.receiver) {
                    const receivers = onlineUsers.filter(u =>
                        u.userId === message.receiver.toString() || u.userId === message.sender.toString()
                    );
                    receivers.forEach(u => {
                        io.to(u.socketId).emit('message-edited', payload);
                    });
                }

            } catch (error) {
                console.error('Error editing message:', error.message);
            }
        });

        // ==========================================
        // TYPING
        // ==========================================
        socket.on('typing', (data) => {
            const { receiverId, isTyping } = data;

            const receivers = onlineUsers.filter(u => u.userId === receiverId);
            receivers.forEach(receiver => {
                io.to(receiver.socketId).emit('typing', {
                    userId: socket.userId,
                    isTyping
                });
            });
        });

        // ==========================================
        // DISCONNECT
        // ==========================================
        socket.on('disconnect', async () => {
            console.log('🔴 Socket disconnected:', socket.id);

            onlineUsers = onlineUsers.filter(u => u.socketId !== socket.id);

            const stillOnline = onlineUsers.some(u => u.userId === socket.userId);

            if (!stillOnline) {
                try {
                    await User.findByIdAndUpdate(socket.userId, {
                        online: false,
                        lastSeen: new Date()
                    });
                } catch (error) {
                    console.error('Error setting user offline:', error.message);
                }
            }

            io.emit('online-users', onlineUsers);
        });
    });
};

module.exports = socketIO;