const UserModel = require('../models/UserModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const registerUser = async (req, res) => {
    try {
        console.log('📩 Register endpoint hit!');
        const { name, email, password, bio, avatar } = req.body;

        const finduser = await UserModel.findOne({ email });
        if (finduser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await UserModel.create({ name, email, password: hashedPassword, bio, avatar });

        res.status(201).json({ message: "User registration successful" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const loginUser = async (req, res) => {
    console.log("🔥 Login endpoint hit!");
    try {
        const { email, password } = req.body;

        const UserExists = await UserModel.findOne({ email });
        if (!UserExists) {
            return res.status(400).json({ message: "Invalid Credentials" });
        }

        const isMatch = await bcrypt.compare(password, UserExists.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid Credentials" });
        }

        const token = jwt.sign(
            { id: UserExists._id, role: UserExists.role },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        const user = {
            _id: UserExists._id,
            name: UserExists.name,
            email: UserExists.email,
            avatar: UserExists.avatar,
            bio: UserExists.bio,
            online: UserExists.online,
            role: UserExists.role // ✅ NEW: frontend needs this to show/hide admin access
        };

        res.status(200).json({ message: "User successfully logged-in", token, user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getUserProfile = async (req, res) => {
    try {
        const user = await UserModel.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "User profile fetched successfully", user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await UserModel.find({ _id: { $ne: req.user.id } }).select('-password');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { name, bio, avatar } = req.body;

        const user = await UserModel.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (name !== undefined) user.name = name;
        if (bio !== undefined) user.bio = bio;
        if (avatar !== undefined) user.avatar = avatar;

        const updatedUser = await user.save();

        res.status(200).json({
            message: "Profile updated",
            user: {
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                bio: updatedUser.bio,
                avatar: updatedUser.avatar,
                online: updatedUser.online,
                role: updatedUser.role // ✅ NEW: keep role present after profile edits too
            }
        });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { registerUser, loginUser, getUserProfile, getUsers, updateProfile };