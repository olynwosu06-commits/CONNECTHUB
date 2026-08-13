const jwt = require('jsonwebtoken');
const Message = require('../models/MessageModel');
const User = require('../models/UserModel');
const Group = require('../models/GroupModel'); // adjust path/name if different

// Store online users — supports multiple sockets per user (multi-device/tab)
let onlineUsers = [];

const socketIO = (io) => {
    // ==========================================
    // AUTH MIDDLEWARE → verify JWT before allowing connection
    // ==========================================
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

        // ==========================================
        // 1. TRACK ONLINE USER (auth already verified userId)
        // ==========================================
        onlineUsers.push({ userId: socket.userId, socketId: socket.id });

        try {
            await User.findByIdAndUpdate(socket.userId, { online: true });
        } catch (error) {
            console.error('Error setting user online:', error.message);
        }

        io.emit('online-users', onlineUsers);
        console.log('👥 Online users:', onlineUsers);

        // ==========================================
        // 2. PRIVATE MESSAGE → 1-on-1 chat
        // ==========================================
                socket.on('private-message', async (data) => {
                    try {
                        const { receiverId, text, image } = data;
                        // ✅ Allow image-only messages (no text required if there's an image)
                        if (!receiverId || (!text && !image)) return;

                        const message = await Message.create({
                            sender: socket.userId,
                            receiver: receiverId,
                            text: text || '',
                            image: image || '',
                            read: false,
                            delivered: false
                });

                const receivers = onlineUsers.filter(u => u.userId === receiverId);

                // Mark as delivered if receiver is online
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

                // Send back to sender with delivered status
                socket.emit('message-sent', {
                    ...message.toObject(),
                    delivered: receivers.length > 0
                });

            } catch (error) {
                console.error('Error sending private message:', error.message);
                socket.emit('error-message', { message: 'Failed to send message' });
            }
        });

        // Mark messages as read when user opens a chat
        socket.on('mark-read', async (data) => {
            try {
                const { senderId } = data;

                // Mark all messages from senderId to this user as read
                await Message.updateMany(
                    { sender: senderId, receiver: socket.userId, read: false },
                    { read: true }
                );

                // Notify the sender their messages were read
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
        // 3. JOIN GROUP → verify membership before joining room
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
                socket.emit('error-message', { message: 'Failed to join group' });
            }
        });

        // ==========================================
        // 4. GROUP MESSAGE → Group chat
        // ==========================================
        socket.on('group-message', async (data) => {
            try {
                const { groupId, text } = data;

                if (!groupId || !text) {
                    return socket.emit('error-message', { message: 'groupId and text are required' });
                }

                // Confirm sender is actually a member before saving/broadcasting
                const group = await Group.findById(groupId);
                if (!group || !group.members.includes(socket.userId)) {
                    return socket.emit('error-message', { message: 'Not authorized to message this group' });
                }

                const message = await Message.create({
                    sender: socket.userId,
                    groupId,
                    text,
                    read: false
                });

                io.to(groupId).emit('new-group-message', {
                    ...message.toObject(),
                    sender: socket.userId
                });

            } catch (error) {
                console.error('Error sending group message:', error.message);
                socket.emit('error-message', { message: 'Failed to send group message' });
            }
        });

        // ==========================================
        // 5. TYPING INDICATOR → Show "typing..."
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
        // 6. DISCONNECT → Remove this socket from online list
        // ==========================================
        socket.on('disconnect', async () => {
            console.log('🔴 Socket disconnected:', socket.id);

            onlineUsers = onlineUsers.filter(u => u.socketId !== socket.id);

            // Only mark user fully offline if they have NO other active sockets
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