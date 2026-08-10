import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../styles/Status.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const CLOUDINARY_CLOUD = 'daaiil1ah';
const CLOUDINARY_PRESET = 'Connecthub';

function Status() {
    const [statuses, setStatuses] = useState([]);
    const [myStatuses, setMyStatuses] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [statusIndex, setStatusIndex] = useState(0);
    const [statusProgress, setStatusProgress] = useState(0);
    const [showCreate, setShowCreate] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [statusImage, setStatusImage] = useState('');
    const [statusBg, setStatusBg] = useState('#00a884');
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);

    const fileInputRef = useRef(null);
    const timerRef = useRef(null);

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // ============================================================
    // FETCH STATUSES
    // ============================================================
    const fetchStatuses = async () => {
        try {
            const [friendsRes, myRes] = await Promise.all([
                axios.get(`${API}/api/status/friends`, authHeaders),
                axios.get(`${API}/api/status/mine`, authHeaders)
            ]);
            // Remove self from friends list since we show separately
            const filtered = friendsRes.data.filter(g => g.user._id !== user._id);
            setStatuses(filtered);
            setMyStatuses(myRes.data);
        } catch (error) {
            console.error('Error fetching statuses:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatuses();
    }, []);

    // ============================================================
    // STATUS VIEWER TIMER
    // ============================================================
    useEffect(() => {
        if (!selectedGroup) return;

        setStatusIndex(0);
        setStatusProgress(0);
        clearInterval(timerRef.current);

        let current = 0;
        let progress = 0;
        const total = selectedGroup.statuses.length;

        timerRef.current = setInterval(() => {
            progress += 2;
            setStatusProgress(progress);
            if (progress >= 100) {
                progress = 0;
                current += 1;
                if (current >= total) {
                    setSelectedGroup(null);
                    clearInterval(timerRef.current);
                } else {
                    setStatusIndex(current);
                    setStatusProgress(0);
                }
            }
        }, 100);

        return () => clearInterval(timerRef.current);
    }, [selectedGroup]);

    // ============================================================
    // VIEW STATUS
    // ============================================================
    const viewStatus = async (group) => {
        setSelectedGroup(group);
        for (const s of group.statuses) {
            try {
                await axios.put(`${API}/api/status/view/${s._id}`, {}, authHeaders);
            } catch (e) {}
        }
        fetchStatuses();
    };

    const viewMyStatus = () => {
        if (myStatuses.length === 0) { setShowCreate(true); return; }
        setSelectedGroup({
            user: { _id: user._id, name: 'My Status', avatar: user.avatar },
            statuses: myStatuses
        });
    };

    const closeViewer = () => {
        clearInterval(timerRef.current);
        setSelectedGroup(null);
        setStatusIndex(0);
        setStatusProgress(0);
    };

    const goNext = (e) => {
        e.stopPropagation();
        if (statusIndex < selectedGroup.statuses.length - 1) {
            setStatusIndex(prev => prev + 1);
            setStatusProgress(0);
        } else {
            closeViewer();
        }
    };

    const goPrev = (e) => {
        e.stopPropagation();
        if (statusIndex > 0) {
            setStatusIndex(prev => prev - 1);
            setStatusProgress(0);
        }
    };

    // ============================================================
    // CREATE STATUS
    // ============================================================
    const uploadImage = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_PRESET);
            const res = await axios.post(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
                formData
            );
            setStatusImage(res.data.secure_url);
        } catch {
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleCreate = async () => {
        if (!statusText.trim() && !statusImage) return;
        try {
            await axios.post(`${API}/api/status/create`, {
                text: statusText,
                image: statusImage,
                backgroundColor: statusBg
            }, authHeaders);
            setShowCreate(false);
            setStatusText('');
            setStatusImage('');
            setStatusBg('#00a884');
            fetchStatuses();
        } catch (error) {
            alert('Failed to post status');
        }
    };

    const deleteStatus = async (statusId) => {
        try {
            await axios.delete(`${API}/api/status/${statusId}`, authHeaders);
            fetchStatuses();
            if (myStatuses.length <= 1) closeViewer();
        } catch (error) {
            alert('Failed to delete');
        }
    };

    const colors = ['#00a884', '#6e2adb', '#f44336', '#ff9800', '#2196f3', '#1a1a1a', '#e91e63', '#009688'];

    const formatTime = (date) => {
        const d = new Date(date);
        return `Today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    if (loading) {
        return (
            <div className="st-loading">
                <div className="st-spinner"></div>
            </div>
        );
    }

    const currentStatus = selectedGroup?.statuses[statusIndex];

    return (
        <div className="st-page">

            {/* ===== LEFT SIDEBAR ===== */}
            <div className={`st-sidebar ${selectedGroup ? 'st-sidebar-hidden-mobile' : ''}`}>
                <div className="st-sidebar-header">
                    <h2>Status</h2>
                    <button className="st-add-btn" onClick={() => setShowCreate(true)} title="Add status">
                        <i className="bx bx-plus-circle"></i>
                    </button>
                </div>

                {/* MY STATUS */}
                <div className="st-section-label">My status</div>
                <div className="st-item" onClick={viewMyStatus}>
                    <div className={`st-avatar-ring ${myStatuses.length > 0 ? 'st-ring-active' : 'st-ring-empty'}`}>
                        {user.avatar ? (
                            <img src={user.avatar} alt="me" className="st-avatar-img" />
                        ) : (
                            <div className="st-avatar-init">{user.name?.charAt(0).toUpperCase()}</div>
                        )}
                        {myStatuses.length === 0 && (
                            <div className="st-avatar-plus">+</div>
                        )}
                    </div>
                    <div className="st-item-info">
                        <div className="st-item-name">My status</div>
                        <div className="st-item-sub">
                            {myStatuses.length > 0
                                ? `${myStatuses.length} update${myStatuses.length > 1 ? 's' : ''}`
                                : 'Click to add status update'
                            }
                        </div>
                    </div>
                </div>

                {/* FRIENDS STATUSES */}
                {statuses.length > 0 && (
                    <>
                        <div className="st-section-label">Recent</div>
                        {statuses.map((group, idx) => (
                            <div
                                key={idx}
                                className={`st-item ${selectedGroup?.user._id === group.user._id ? 'st-item-active' : ''}`}
                                onClick={() => viewStatus(group)}
                            >
                                <div className={`st-avatar-ring ${group.hasUnread ? 'st-ring-unread' : 'st-ring-viewed'}`}>
                                    {group.user.avatar ? (
                                        <img src={group.user.avatar} alt={group.user.name} className="st-avatar-img" />
                                    ) : (
                                        <div className="st-avatar-init">{group.user.name?.charAt(0).toUpperCase()}</div>
                                    )}
                                </div>
                                <div className="st-item-info">
                                    <div className="st-item-name">{group.user.name}</div>
                                    <div className="st-item-sub">
                                        {formatTime(group.statuses[0]?.createdAt)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {statuses.length === 0 && myStatuses.length === 0 && (
                    <div className="st-empty">
                        <p>📸</p>
                        <p>No status updates yet</p>
                        <p style={{ fontSize: 13 }}>Add friends and post a status!</p>
                    </div>
                )}
            </div>

            {/* ===== RIGHT PANEL ===== */}
            <div className={`st-right ${selectedGroup ? 'st-right-viewing' : ''}`}>
                {selectedGroup ? (
                    /* STATUS VIEWER */
                    <div className="st-viewer" onClick={closeViewer}>
                        {/* Progress bars */}
                        <div className="st-progress-bars">
                            {selectedGroup.statuses.map((_, i) => (
                                <div key={i} className="st-progress-bar">
                                    <div
                                        className="st-progress-fill"
                                        style={{
                                            width: i < statusIndex ? '100%'
                                                : i === statusIndex ? `${statusProgress}%`
                                                : '0%'
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Header */}
                        <div className="st-viewer-header">
                            <div className="st-viewer-user">
                                <div className="st-viewer-avatar">
                                    {selectedGroup.user.avatar ? (
                                        <img src={selectedGroup.user.avatar} alt="" className="st-avatar-img" />
                                    ) : (
                                        selectedGroup.user.name?.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div>
                                    <div className="st-viewer-name">{selectedGroup.user.name}</div>
                                    <div className="st-viewer-time">{formatTime(currentStatus?.createdAt)}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                {selectedGroup.user._id === user._id && (
                                    <button
                                        className="st-delete-btn"
                                        onClick={(e) => { e.stopPropagation(); deleteStatus(currentStatus?._id); }}
                                    >
                                        🗑️
                                    </button>
                                )}
                                <button className="st-close-btn" onClick={closeViewer}>✕</button>
                            </div>
                        </div>

                        {/* Content */}
                        <div
                            className="st-viewer-content"
                            style={{ background: currentStatus?.image ? 'black' : currentStatus?.backgroundColor }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Tap zones */}
                            <div className="st-tap-prev" onClick={goPrev} />
                            <div className="st-tap-next" onClick={goNext} />

                            {currentStatus?.image && (
                                <img src={currentStatus.image} alt="status" className="st-viewer-img" />
                            )}
                            {currentStatus?.text && (
                                <div className="st-viewer-text">{currentStatus.text}</div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* EMPTY RIGHT */
                    <div className="st-empty-right">
                        <div className="st-empty-icon">🔒</div>
                        <h2>Share statuses</h2>
                        <p>Share photos, videos and text that disappear after 24 hours.</p>
                        <button className="st-create-btn" onClick={() => setShowCreate(true)}>
                            + Add Status
                        </button>
                    </div>
                )}
            </div>

            {/* ===== CREATE STATUS MODAL ===== */}
            {showCreate && (
                <div className="st-modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="st-modal" onClick={e => e.stopPropagation()}>
                        <div className="st-modal-header">
                            <h3>New Status</h3>
                            <button onClick={() => setShowCreate(false)}>✕</button>
                        </div>

                        {/* Preview */}
                        <div
                            className="st-modal-preview"
                            style={{ background: statusImage ? 'black' : statusBg }}
                        >
                            {statusImage ? (
                                <img src={statusImage} alt="preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            ) : (
                                <span className="st-modal-preview-text">
                                    {statusText || 'Preview...'}
                                </span>
                            )}
                        </div>

                        <div className="st-modal-body">
                            <input
                                type="text"
                                placeholder="Type your status..."
                                className="st-modal-input"
                                value={statusText}
                                onChange={e => setStatusText(e.target.value)}
                                maxLength={200}
                            />

                            {/* Colors */}
                            <div className="st-colors">
                                {colors.map(color => (
                                    <div
                                        key={color}
                                        className={`st-color ${statusBg === color && !statusImage ? 'st-color-active' : ''}`}
                                        style={{ background: color }}
                                        onClick={() => { setStatusBg(color); setStatusImage(''); }}
                                    />
                                ))}
                            </div>

                            {/* Image upload */}
                            <button
                                className="st-upload-btn"
                                onClick={() => fileInputRef.current.click()}
                            >
                                {uploading ? '⏳ Uploading...' : '📷 Add Photo'}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={uploadImage}
                            />

                            {statusImage && (
                                <button className="st-remove-btn" onClick={() => setStatusImage('')}>
                                    ✕ Remove photo
                                </button>
                            )}

                            <button
                                className="st-post-btn"
                                onClick={handleCreate}
                                disabled={!statusText.trim() && !statusImage}
                            >
                                Post Status
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Status;