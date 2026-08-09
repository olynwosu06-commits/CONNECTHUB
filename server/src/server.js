const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const socketIO = require('./socket/socket');

const app = express();
const server = http.createServer(app);

// ====== THE FIX: ALLOW EVERYTHING ======
const cors = require('cors');

app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use(express.json());

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/friends', require('./routes/friendRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));
app.use('/api/status', require('./routes/statusRoutes'));

socketIO(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});