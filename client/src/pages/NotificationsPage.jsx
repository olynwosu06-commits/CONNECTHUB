import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import '../styles/NotificationsPage.css'; // Import the separate CSS

// ============================================================
// ICON MAPPER
// ============================================================
const iconFor = (type) => {
    switch (type) {
        case 'friend_request': return '👋';
        case 'friend_accepted': return '✅';
        case 'friend_declined': return '❌';
        case 'friend_removed': return '🚫';
        case 'added_to_group': return '⬡';
        case 'removed_from_group': return '🚪';
        default: return '🔔';
    }
};

// ============================================================
// TIME AGO HELPER
// ============================================================
const timeAgo = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString();
};

// ============================================================
// TYPE BADGE COLORS
// ============================================================
const getBadgeColor = (type) => {
    switch (type) {
        case 'friend_request': return 'badge-request';
        case 'friend_accepted': return 'badge-accepted';
        case 'friend_declined': return 'badge-declined';
        case 'friend_removed': return 'badge-removed';
        case 'added_to_group': return 'badge-added';
        case 'removed_from_group': return 'badge-removed-group';
        default: return 'badge-default';
    }
};

// ============================================================
// MAIN COMPONENT
// ============================================================
function NotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all | unread | read
    const [selectedType, setSelectedType] = useState('all');
    const [isAnimating, setIsAnimating] = useState(false);
    const notificationRefs = useRef({});
    const navigate = useNavigate();

    const token = localStorage.getItem('token');
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // ============================================================
    // FETCH NOTIFICATIONS
    // ============================================================
    const fetchNotifications = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/notifications`, authHeaders);
            setNotifications(res.data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    // ============================================================
    // MARK ALL AS READ
    // ============================================================
    const handleMarkAllRead = async () => {
        try {
            setIsAnimating(true);
            await axios.put(`${API_BASE_URL}/api/notifications/read-all`, {}, authHeaders);
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setTimeout(() => setIsAnimating(false), 500);
        } catch (error) {
            console.error('Error marking all as read:', error);
            setIsAnimating(false);
        }
    };

    // ============================================================
    // MARK SINGLE AS READ
    // ============================================================
    const handleNotificationClick = async (notification) => {
        if (!notification.read) {
            try {
                await axios.put(`${API_BASE_URL}/api/notifications/${notification._id}/read`, {}, authHeaders);
                setNotifications(prev =>
                    prev.map(n => n._id === notification._id ? { ...n, read: true } : n)
                );
            } catch (error) {
                console.error('Error marking as read:', error);
            }
        }

        // Navigate based on type
        if (['friend_request', 'friend_accepted', 'friend_declined', 'friend_removed'].includes(notification.type)) {
            navigate('/home');
        } else if (['added_to_group', 'removed_from_group'].includes(notification.type)) {
            navigate('/home');
        }
    };

    // ============================================================
    // DELETE NOTIFICATION
    // ============================================================
    const handleDelete = async (e, notificationId) => {
        e.stopPropagation();
        try {
            await axios.delete(`${API_BASE_URL}/api/notifications/${notificationId}`, authHeaders);
            setNotifications(prev => prev.filter(n => n._id !== notificationId));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    // ============================================================
    // FILTER NOTIFICATIONS
    // ============================================================
    const getFilteredNotifications = () => {
        let filtered = notifications;

        // Filter by read status
        if (filter === 'unread') {
            filtered = filtered.filter(n => !n.read);
        } else if (filter === 'read') {
            filtered = filtered.filter(n => n.read);
        }

        // Filter by type
        if (selectedType !== 'all') {
            filtered = filtered.filter(n => n.type === selectedType);
        }

        return filtered;
    };

    // ============================================================
    // GET UNIQUE TYPES FOR FILTER
    // ============================================================
    const getUniqueTypes = () => {
        const types = new Set(notifications.map(n => n.type));
        return Array.from(types);
    };

    // ============================================================
    // GET TYPE LABEL
    // ============================================================
    const getTypeLabel = (type) => {
        const labels = {
            friend_request: 'Friend Requests',
            friend_accepted: 'Accepted',
            friend_declined: 'Declined',
            friend_removed: 'Removed',
            added_to_group: 'Added to Space',
            removed_from_group: 'Removed from Space'
        };
        return labels[type] || type;
    };

    // ============================================================
    // STATS
    // ============================================================
    const unreadCount = notifications.filter(n => !n.read).length;
    const filteredNotifications = getFilteredNotifications();

    // ============================================================
    // LOADING STATE
    // ============================================================
    if (loading) {
        return (
            <div className="np-loading">
                <div className="np-spinner"></div>
                <p>Loading notifications...</p>
            </div>
        );
    }

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <div className="np-container">
            {/* Header */}
            <div className="np-header">
                <div className="np-header-left">
                    <h1 className="np-title">
                        <span className="np-title-icon">🔔</span>
                        Notifications
                        {unreadCount > 0 && (
                            <span className="np-badge-count">{unreadCount}</span>
                        )}
                    </h1>
                    <p className="np-subtitle">
                        {notifications.length === 0 
                            ? 'Stay updated with your activity' 
                            : `${notifications.length} total notifications`}
                    </p>
                </div>
                <div className="np-header-actions">
                    {unreadCount > 0 && (
                        <button 
                            className={`np-mark-all ${isAnimating ? 'np-mark-all-animate' : ''}`}
                            onClick={handleMarkAllRead}
                        >
                            <span className="np-mark-icon">✓</span>
                            Mark all read
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Bar */}
            {notifications.length > 0 && (
                <div className="np-stats">
                    <div className="np-stat-item">
                        <span className="np-stat-number">{notifications.length}</span>
                        <span className="np-stat-label">Total</span>
                    </div>
                    <div className="np-stat-item np-stat-unread">
                        <span className="np-stat-number">{unreadCount}</span>
                        <span className="np-stat-label">Unread</span>
                    </div>
                    <div className="np-stat-item np-stat-read">
                        <span className="np-stat-number">{notifications.length - unreadCount}</span>
                        <span className="np-stat-label">Read</span>
                    </div>
                </div>
            )}

            {/* Filters */}
            {notifications.length > 0 && (
                <div className="np-filters">
                    <div className="np-filter-group">
                        <button 
                            className={`np-filter-btn ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            All
                        </button>
                        <button 
                            className={`np-filter-btn ${filter === 'unread' ? 'active' : ''}`}
                            onClick={() => setFilter('unread')}
                        >
                            Unread
                            {unreadCount > 0 && <span className="np-filter-count">{unreadCount}</span>}
                        </button>
                        <button 
                            className={`np-filter-btn ${filter === 'read' ? 'active' : ''}`}
                            onClick={() => setFilter('read')}
                        >
                            Read
                        </button>
                    </div>

                    <div className="np-filter-types">
                        <select 
                            className="np-type-select"
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                        >
                            <option value="all">All Types</option>
                            {getUniqueTypes().map(type => (
                                <option key={type} value={type}>
                                    {getTypeLabel(type)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* Notification List */}
            {filteredNotifications.length === 0 ? (
                <div className="np-empty">
                    <div className="np-empty-icon">🔔</div>
                    <h3 className="np-empty-title">All caught up!</h3>
                    <p className="np-empty-text">
                        {notifications.length === 0 
                            ? "You don't have any notifications yet. Connect with friends and join spaces to start getting updates!" 
                            : "You've read all your notifications. Come back later for new updates."}
                    </p>
                </div>
            ) : (
                <div className="np-list">
                    {filteredNotifications.map((notification, index) => (
                        <div
                            key={notification._id}
                            ref={el => notificationRefs.current[notification._id] = el}
                            className={`np-item ${!notification.read ? 'np-item-unread' : ''}`}
                            onClick={() => handleNotificationClick(notification)}
                            style={{
                                animationDelay: `${index * 30}ms`
                            }}
                        >
                            {/* Icon */}
                            <div className={`np-item-icon ${getBadgeColor(notification.type)}`}>
                                {iconFor(notification.type)}
                            </div>

                            {/* Content */}
                            <div className="np-item-content">
                                <div className="np-item-message">
                                    {notification.message}
                                </div>
                                <div className="np-item-meta">
                                    <span className="np-item-time">
                                        <span className="np-time-icon">🕐</span>
                                        {timeAgo(notification.createdAt)}
                                    </span>
                                    <span className="np-item-type">
                                        {getTypeLabel(notification.type)}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="np-item-actions">
                                {!notification.read && (
                                    <span className="np-unread-dot" />
                                )}
                                <button 
                                    className="np-delete-btn"
                                    onClick={(e) => handleDelete(e, notification._id)}
                                    title="Dismiss"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default NotificationsPage;