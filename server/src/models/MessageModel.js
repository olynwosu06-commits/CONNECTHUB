const mongoose = require("mongoose");

const MessageModel = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    text: {
        type: String,
        default: ''
    },
    image: {
        type: String,
        default: ''
    },
    audio: {
        type: String,
        default: ''
    },
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: false
    },
    // 'text' | 'system' | 'image'
    type: {
        type: String,
        enum: ['text', 'system', 'image', 'audio'],
        default: 'text'
    },
    read: {
        type: Boolean,
        default: false
    },
    delivered: {
        type: Boolean,
        default: false
    },
    // true when the message has been edited
    edited: {
        type: Boolean,
        default: false
    },
    // users who deleted this message "for me"
    deletedFor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // true when the sender deleted it "for everyone"
    deletedForEveryone: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageModel);