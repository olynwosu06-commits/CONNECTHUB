const mongoose = require('mongoose');

const UserModel = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    bio: {
        type: String,
        default: 'Hey there! I am using ConnectHub'  // ← Added a default bio
    },
    avatar: {
        type: String,
        default: '' // ← Optional: default avatar URL
    },
    online: {
        type: Boolean,
        default: false // ← Track if user is online
    },
    lastSeen: {
        type: Date,
        default: Date.now // ← Track last activity
    },
        resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    },
    role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
    }
}, { timestamps: true }); // ← ADD THIS!

module.exports = mongoose.model('User', UserModel);