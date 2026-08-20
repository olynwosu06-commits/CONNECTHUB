const Group = require('../models/GroupModel');
const Message = require('../models/MessageModel');
const User = require('../models/UserModel');
const { createNotification } = require('./notificationController');

// ======================
// CREATE GROUP
// ======================
const createGroup = async (req, res) => {
    try {
        const { name, members } = req.body;
        const adminId = req.user.id;

        if (!name || !members || members.length === 0) {
            return res.status(400).json({ message: 'Name and at least one member required' });
        }

        const allMembers = [...new Set([adminId, ...members])];

        const group = await Group.create({
            name,
            admin: adminId,
            members: allMembers
        });

        const populated = await group.populate('members', 'name email avatar online');

        res.status(201).json({ message: 'Group created', group: populated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ======================
// GET MY GROUPS
// ======================
const getMyGroups = async (req, res) => {
    try {
        const userId = req.user.id;

        const groups = await Group.find({ members: userId })
            .populate('members', 'name email avatar online')
            .populate('admin', 'name')
            .sort({ lastMessageTime: -1 });

        res.status(200).json(groups);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ======================
// GET GROUP MESSAGES
// ======================
const getGroupMessages = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.id;

        const group = await Group.findById(groupId);
        if (!group || !group.members.includes(userId)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const messages = await Message.find({ groupId })
            .populate('sender', 'name avatar')
            .sort({ createdAt: 1 });

        const formatted = messages.map(msg => ({
            _id: msg._id,
            senderId: msg.sender?._id?.toString() || null,
            senderName: msg.sender?.name || 'System',
            text: msg.deletedForEveryone ? 'This message was deleted' : msg.text,
            image: msg.image || '',
            type: msg.type || 'text',
            edited: msg.edited || false,
            time: new Date(msg.createdAt).toLocaleTimeString(),
            createdAt: msg.createdAt,
            deletedForEveryone: msg.deletedForEveryone
        }));

        res.status(200).json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ======================
// UPDATE GROUP (name / avatar)
// ======================
const updateGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { name, avatar } = req.body;
        const userId = req.user.id;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        if (group.admin.toString() !== userId) {
            return res.status(403).json({ message: 'Only admin can update the group' });
        }

        if (name) group.name = name.trim();
        if (avatar !== undefined) group.avatar = avatar;

        await group.save();

        const populated = await group.populate('members', 'name email avatar online');

        res.status(200).json({ message: 'Group updated', group: populated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ======================
// ADD MEMBERS (supports multiple)
// ======================
const addMembers = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { members } = req.body; // array of userIds
        const adminId = req.user.id;

        if (!members || !Array.isArray(members) || members.length === 0) {
            return res.status(400).json({ message: 'Members array is required' });
        }

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        if (group.admin.toString() !== adminId) {
            return res.status(403).json({ message: 'Only admin can add members' });
        }

        const newMembers = members.filter(id => !group.members.includes(id));

        if (newMembers.length === 0) {
            return res.status(400).json({ message: 'All users are already in the group' });
        }

        group.members.push(...newMembers);
        await group.save();

        const adminUser = await User.findById(adminId).select('name');

        // Create system messages for each new member + notify them
        for (const memberId of newMembers) {
            const user = await User.findById(memberId).select('name');
            const systemText = `${user?.name || 'Someone'} was added to the space`;

            await Message.create({
                sender: adminId,
                groupId,
                text: systemText,
                type: 'system'
            });

            // ✅ Notify the newly added member
            await createNotification({
                recipient: memberId,
                type: 'added_to_group',
                message: `${adminUser.name} added you to "${group.name}"`,
                fromUser: adminId,
                groupId
            });
        }

        const populated = await group.populate('members', 'name email avatar online');

        res.status(200).json({ message: 'Members added', group: populated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ======================
// REMOVE MEMBER
// ======================
const removeMember = async (req, res) => {
    try {
        const { groupId, memberId } = req.params;
        const adminId = req.user.id;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        if (group.admin.toString() !== adminId) {
            return res.status(403).json({ message: 'Only admin can remove members' });
        }

        if (memberId === adminId) {
            return res.status(400).json({ message: 'Admin cannot remove themselves' });
        }

        if (!group.members.includes(memberId)) {
            return res.status(400).json({ message: 'User is not in the group' });
        }

        group.members = group.members.filter(id => id.toString() !== memberId);
        await group.save();

        // Create system message
        const user = await User.findById(memberId).select('name');
        const systemText = `${user?.name || 'Someone'} was removed from the space`;

        await Message.create({
            sender: adminId,
            groupId,
            text: systemText,
            type: 'system'
        });

        // ✅ Notify the removed member
        const adminUser = await User.findById(adminId).select('name');
        await createNotification({
            recipient: memberId,
            type: 'removed_from_group',
            message: `${adminUser.name} removed you from "${group.name}"`,
            fromUser: adminId,
            groupId
        });

        const populated = await group.populate('members', 'name email avatar online');

        res.status(200).json({ message: 'Member removed', group: populated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createGroup,
    getMyGroups,
    getGroupMessages,
    updateGroup,
    addMembers,
    removeMember
};