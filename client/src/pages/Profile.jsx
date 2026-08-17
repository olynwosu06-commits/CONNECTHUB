import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/Profile.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const CLOUDINARY_CLOUD = 'daaiil1ah';
const CLOUDINARY_PRESET = 'Connecthub';

function Profile() {
    const [profile, setProfile] = useState(null);
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [avatar, setAvatar] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    const token = localStorage.getItem('token');
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await axios.get(`${API}/api/auth/profile`, authHeaders);
                const user = res.data.user;
                setProfile(user);
                setName(user.name || '');
                setBio(user.bio || '');
                setAvatar(user.avatar || '');
            } catch (error) {
                if (error.response?.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    navigate('/login');
                } else {
                    showNotification('Failed to load profile', 'error');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { showNotification('Please select an image', 'error'); return; }
        if (file.size > 5 * 1024 * 1024) { showNotification('Image must be under 5MB', 'error'); return; }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_PRESET);
            const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, formData);
            setAvatar(res.data.secure_url);
            setEditMode(true);
            showNotification('Photo uploaded! Save to apply.', 'success');
        } catch {
            showNotification('Upload failed', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) { showNotification('Name cannot be empty', 'error'); return; }
        setSaving(true);
        try {
            const res = await axios.put(`${API}/api/auth/profile`, { name, bio, avatar }, authHeaders);
            const u = res.data.user;
            localStorage.setItem('user', JSON.stringify({ _id: u._id, name: u.name, email: u.email, bio: u.bio, avatar: u.avatar, online: u.online }));
            setProfile(u);
            setName(u.name); setBio(u.bio || ''); setAvatar(u.avatar || '');
            setEditMode(false);
            showNotification('Profile saved!', 'success');
        } catch {
            showNotification('Failed to save', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditMode(false);
        setName(profile?.name || '');
        setBio(profile?.bio || '');
        setAvatar(profile?.avatar || '');
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (loading) return <div className="pf-loading"><div className="pf-spinner"></div></div>;

    const initials = name?.charAt(0).toUpperCase() || '?';
    const joinDate = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—';

    return (
        <>
            {notification.show && (
                <div className={`pf-toast pf-toast-${notification.type}`}>{notification.message}</div>
            )}

            <div className="pf-page">
                {/* TOP BAR */}
                <div className="pf-topbar">
                    <button className="pf-back" onClick={() => navigate('/home')}>
                        <i className="bx bx-arrow-back"></i>
                    </button>
                    <span>Profile</span>
                    {!editMode ? (
                        <button className="pf-topbar-edit" onClick={() => setEditMode(true)}>Edit</button>
                    ) : (
                        <button className="pf-topbar-edit" onClick={handleCancel}>Cancel</button>
                    )}
                </div>

                <div className="pf-scroll">
                    {/* COVER + AVATAR */}
                    <div className="pf-cover">
                        <div className="pf-cover-bg"></div>
                        <div className="pf-avatar-ring" onClick={() => fileInputRef.current.click()}>
                            {avatar ? (
                                <img src={avatar} alt="avatar" className="pf-avatar-img" />
                            ) : (
                                <div className="pf-avatar-init">{initials}</div>
                            )}
                            <div className="pf-avatar-cam">
                                {uploading ? <i className="bx bx-loader-alt bx-spin"></i> : <i className="bx bx-camera"></i>}
                            </div>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                    </div>

                    {/* NAME + BIO */}
                    <div className="pf-identity">
                        {editMode ? (
                            <div className="pf-edit-group">
                                <div className="pf-input-wrap">
                                    <label>Display Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        maxLength={50}
                                        placeholder="Your name"
                                    />
                                    <span className="pf-count">{name.length}/50</span>
                                </div>
                                <div className="pf-input-wrap">
                                    <label>Bio</label>
                                    <textarea
                                        value={bio}
                                        onChange={e => setBio(e.target.value)}
                                        maxLength={150}
                                        rows={3}
                                        placeholder="Something about yourself..."
                                    />
                                    <span className="pf-count">{bio.length}/150</span>
                                </div>
                                <button className="pf-save" onClick={handleSave} disabled={saving || uploading}>
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        ) : (
                            <>
                                <h1 className="pf-name">{name || 'No Name'}</h1>
                                <p className="pf-bio-text">{bio || 'Hey there! I am using ConnectHub 👋'}</p>
                                <div className="pf-status-pill">
                                    <span className={`pf-dot ${profile?.online ? 'on' : 'off'}`}></span>
                                    {profile?.online ? 'Online' : 'Offline'}
                                </div>
                            </>
                        )}
                    </div>

                    {/* INFO CARDS */}
                    <div className="pf-cards">
                        <div className="pf-card">
                            <div className="pf-card-icon" style={{ background: '#e8f5e9' }}>📧</div>
                            <div className="pf-card-body">
                                <span className="pf-card-label">Email</span>
                                <span className="pf-card-value">{profile?.email}</span>
                            </div>
                        </div>
                        <div className="pf-card">
                            <div className="pf-card-icon" style={{ background: '#e3f2fd' }}>📅</div>
                            <div className="pf-card-body">
                                <span className="pf-card-label">Member Since</span>
                                <span className="pf-card-value">{joinDate}</span>
                            </div>
                        </div>
                        <div className="pf-card">
                            <div className="pf-card-icon" style={{ background: '#f3e5f5' }}>👤</div>
                            <div className="pf-card-body">
                                <span className="pf-card-label">Username</span>
                                <span className="pf-card-value">@{name?.toLowerCase().replace(/\s+/g, '_') || 'user'}</span>
                            </div>
                        </div>
                        <div className="pf-card">
                            <div className="pf-card-icon" style={{ background: '#fff3e0' }}>🕐</div>
                            <div className="pf-card-body">
                                <span className="pf-card-label">Last Seen</span>
                                <span className="pf-card-value">
                                    {profile?.lastSeen ? new Date(profile.lastSeen).toLocaleString() : 'Now'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* SETTINGS LIST */}
                    <div className="pf-section-title">Preferences</div>
                    <div className="pf-list">
                        <div className="pf-list-item">
                            <div className="pf-list-icon">🔒</div>
                            <div className="pf-list-body">
                                <span>Privacy</span>
                                <small>Manage who can see your info</small>
                            </div>
                            <i className="bx bx-chevron-right"></i>
                        </div>
                        <div className="pf-list-item">
                            <div className="pf-list-icon">🔔</div>
                            <div className="pf-list-body">
                                <span>Notifications</span>
                                <small>Message and call alerts</small>
                            </div>
                            <i className="bx bx-chevron-right"></i>
                        </div>
                        <div className="pf-list-item">
                            <div className="pf-list-icon">⚙️</div>
                            <div className="pf-list-body">
                                <span>Settings</span>
                                <small>App preferences</small>
                            </div>
                            <i className="bx bx-chevron-right"></i>
                        </div>
                    </div>

                    <div className="pf-section-title">Account</div>
                    <div className="pf-list">
                        {profile?.role === 'admin' && (
                            <div className="pf-list-item" onClick={() => navigate('/admin')}>
                                <div className="pf-list-icon">🛡️</div>
                                <div className="pf-list-body">
                                    <span>Admin Dashboard</span>
                                    <small>Manage users and view stats</small>
                                </div>
                                <i className="bx bx-chevron-right"></i>
                            </div>
                        )}
                        <div className="pf-list-item pf-list-danger" onClick={handleLogout}>
                            <div className="pf-list-icon">🚪</div>
                            <div className="pf-list-body">
                                <span>Log Out</span>
                                <small>Sign out of ConnectHub</small>
                            </div>
                            <i className="bx bx-chevron-right"></i>
                        </div>
                    </div>

                    <div className="pf-footer">ConnectHub v1.0 · Made with ❤️</div>
                </div>
            </div>
        </>
    );
}

export default Profile;