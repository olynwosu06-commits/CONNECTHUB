const UserModel = require('../models/UserModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

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
            { expiresIn: "7d" }
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

// Forgot Password - Send Reset Email
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await UserModel.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        // Generate reset token
        const resetToken = crypto.randomBytes(20).toString('hex');
        
        // Save token to user (valid for 1 hour)
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();
        
        // Send email with reset link
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
        
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Reset Request',
            html: `
                <h1>Password Reset</h1>
                <p>You requested a password reset. Click the link below:</p>
                <a href="${resetUrl}">${resetUrl}</a>
                <p>This link expires in 1 hour.</p>
                <p>If you didn't request this, ignore this email.</p>
            `
        };
        
        await transporter.sendMail(mailOptions);
        
        res.status(200).json({ message: "Reset email sent successfully" });
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ message: error.message });
    }
};

// Reset Password
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        // Find user by reset token and check if token is still valid
        const user = await UserModel.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() } // Token not expired
        });
        
        if (!user) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        
        // Clear reset token fields
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        
        await user.save();
        
        res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { registerUser, loginUser, getUserProfile, getUsers, updateProfile, forgotPassword, resetPassword };