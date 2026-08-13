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
        required: true
    },
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: false
    },
    read: {
        type: Boolean,
        default: false
    },
    delivered: {
        type: Boolean,
        default: false
    },
    // ✅ NEW: users who deleted this message "for me" (message stays for the other person)
    deletedFor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // ✅ NEW: true when the sender deleted it "for everyone"
    deletedForEveryone: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });


module.exports = mongoose.model('Message', MessageModel);