import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { io } from 'socket.io-client';

function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('dashboard');
    const navigate = useNavigate();

    const token = localStorage.getItem('token');
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // ---------- Data ----------
    const fetchData = useCallback(async () => {
        try {
            const [usersRes, statsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/admin/users`, authHeaders),
                axios.get(`${API_BASE_URL}/api/admin/stats`, authHeaders)
            ]);
            setUsers(usersRes.data);
            setStats(statsRes.data);
        } catch (error) {
            if (error.response?.status === 403) {
                alert('You do not have admin access');
                navigate('/home');
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchData();

        const socket = io(API_BASE_URL, { auth: { token } });

        socket.on('userOnline', (userId) => {
            setUsers(prev => prev.map(u => u._id === userId ? { ...u, online: true } : u));
            setStats(prev => prev ? { ...prev, onlineUsers: (prev.onlineUsers || 0) + 1 } : prev);
        });

        socket.on('userOffline', (userId) => {
            setUsers(prev => prev.map(u => u._id === userId ? { ...u, online: false } : u));
            setStats(prev => prev ? { ...prev, onlineUsers: Math.max(0, (prev.onlineUsers || 0) - 1) } : prev);
        });

        socket.on('newUser', (user) => {
            setUsers(prev => [user, ...prev]);
            setStats(prev => prev ? { ...prev, totalUsers: prev.totalUsers + 1 } : prev);
        });

        socket.on('statsUpdate', (newStats) => {
            setStats(prev => ({ ...prev, ...newStats }));
        });

        socket.on('userRoleUpdated', ({ userId, role }) => {
            setUsers(prev => prev.map(u => u._id === userId ? { ...u, role } : u));
        });

        return () => socket.disconnect();
    }, [fetchData, token]);

    // ---------- Actions ----------
    const handleDelete = async (userId, name) => {
        if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/admin/users/${userId}`, authHeaders);
            setUsers(prev => prev.filter(u => u._id !== userId));
            setStats(prev => prev ? { ...prev, totalUsers: prev.totalUsers - 1 } : prev);
        } catch (err) {
            alert(err.response?.data?.message || 'Delete failed');
        }
    };

    const handleChangeRole = async (userId, currentRole, name) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        if (!window.confirm(`${newRole === 'admin' ? 'Promote' : 'Demote'} ${name}?`)) return;
        try {
            await axios.patch(`${API_BASE_URL}/api/admin/users/${userId}/role`, { role: newRole }, authHeaders);
            setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
        } catch (err) {
            alert(err.response?.data?.message || 'Role update failed');
        }
    };

    const handleBan = async (userId, name, isBanned) => {
        const action = isBanned ? 'Unban' : 'Ban';
        if (!window.confirm(`${action} ${name}?`)) return;
        try {
            await axios.patch(`${API_BASE_URL}/api/admin/users/${userId}/ban`, { banned: !isBanned }, authHeaders);
            setUsers(prev => prev.map(u => u._id === userId ? { ...u, banned: !isBanned } : u));
        } catch (err) {
            alert(err.response?.data?.message || `${action} failed`);
        }
    };

    const filteredUsers = users.filter(u => {
        const q = search.toLowerCase();
        const matches = u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
        if (filter === 'online') return matches && u.online;
        if (filter === 'admin') return matches && u.role === 'admin';
        if (filter === 'banned') return matches && u.banned;
        return matches;
    });

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    if (loading) {
        return (
            <div style={s.page}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#7c6b9e' }}>
                    Loading dashboard...
                </div>
            </div>
        );
    }

    return (
        <div style={s.page}>
            {/* ========== SIDEBAR ========== */}
            <aside style={s.sidebar}>
                <div style={s.profileBox}>
                    <div style={s.avatarBig}>
                        {currentUser.avatar ? (
                            <img src={currentUser.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        ) : (
                            currentUser.name?.charAt(0).toUpperCase() || 'A'
                        )}
                    </div>
                    <div style={{ marginTop: 12, fontWeight: 600, color: '#4a3f6b' }}>Hi, {currentUser.name?.split(' ')[0] || 'Admin'}!</div>
                    <div style={{ fontSize: 13, color: '#8b7cb0', marginTop: 2 }}>Good to see you again</div>
                </div>

                <nav style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
                        { id: 'users', label: 'Users', icon: '👥' },
                        { id: 'messages', label: 'Messages', icon: '💬' },
                        { id: 'settings', label: 'Settings', icon: '⚙️' },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            style={{
                                ...s.navBtn,
                                background: activeTab === item.id ? '#fff' : 'transparent',
                                color: activeTab === item.id ? '#6b4eff' : '#6b5b8a',
                                boxShadow: activeTab === item.id ? '0 4px 12px rgba(107, 78, 255, 0.15)' : 'none'
                            }}
                        >
                            <span style={{ fontSize: 18 }}>{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div style={s.plantCard}>
                    <div style={{ fontSize: 28 }}>🌱</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#5a4a7a', marginTop: 6 }}>
                        Take breaks,<br />stay positive
                    </div>
                </div>
            </aside>

            {/* ========== MAIN ========== */}
            <main style={s.main}>
                {/* Top bar */}
                <header style={s.header}>
                    <div>
                        <h1 style={s.greeting}>{greeting}, {currentUser.name?.split(' ')[0] || 'Admin'}! ☁️</h1>
                        <p style={{ margin: '4px 0 0', color: '#8b7cb0', fontSize: 15 }}>
                            Here's what's happening with your chat today.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button style={s.iconBtn}>🔍</button>
                        <button style={s.iconBtn}>🔔</button>
                        <button onClick={() => navigate('/home')} style={{ ...s.iconBtn, background: '#6b4eff', color: '#fff' }}>
                            ← Chat
                        </button>
                    </div>
                </header>

                {/* Stats Cards */}
                {stats && (
                    <div style={s.statsRow}>
                        <StatCard
                            color="#e8e0ff"
                            icon="✅"
                            label="Total Users"
                            value={stats.totalUsers}
                            sub={`+${users.filter(u => {
                                const d = new Date(u.createdAt);
                                const yesterday = new Date();
                                yesterday.setDate(yesterday.getDate() - 1);
                                return d > yesterday;
                            }).length} from yesterday`}
                        />
                        <StatCard
                            color="#ffe8f0"
                            icon="🟢"
                            label="Online Now"
                            value={stats.onlineUsers}
                            sub="Live right now"
                        />
                        <StatCard
                            color="#e0f7f0"
                            icon="💬"
                            label="Messages"
                            value={stats.totalMessages?.toLocaleString() || 0}
                            sub="All time"
                        />
                        <StatCard
                            color="#fff3e0"
                            icon="⭐"
                            label="Admins"
                            value={users.filter(u => u.role === 'admin').length}
                            sub="Active moderators"
                        />
                    </div>
                )}

                {/* Content Grid */}
                <div style={s.contentGrid}>
                    {/* Left - Users Table */}
                    <div style={s.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                            <h3 style={{ margin: 0, fontSize: 17, color: '#3d2e6b' }}>All Users</h3>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {['all', 'online', 'admin', 'banned'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        style={{
                                            ...s.chip,
                                            background: filter === f ? '#6b4eff' : '#f3f0ff',
                                            color: filter === f ? '#fff' : '#6b5b8a'
                                        }}
                                    >
                                        {f.charAt(0).toUpperCase() + f.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={s.searchInput}
                        />

                        <div style={{ marginTop: 14, maxHeight: 420, overflowY: 'auto' }}>
                            {filteredUsers.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 40, color: '#a89bc4' }}>
                                    No users found
                                </div>
                            ) : (
                                filteredUsers.map(u => (
                                    <div key={u._id} style={s.userRow}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                                            <div style={s.userAvatar}>
                                                {u.avatar ? (
                                                    <img src={u.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    u.name?.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#3d2e6b', fontSize: 14 }}>
                                                    {u.name}
                                                    {u.role === 'admin' && (
                                                        <span style={s.adminBadge}>ADMIN</span>
                                                    )}
                                                    {u.banned && (
                                                        <span style={s.bannedBadge}>BANNED</span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: 12, color: '#9b8bb8' }}>{u.email}</div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{
                                                fontSize: 12,
                                                color: u.online ? '#00a884' : '#a89bc4',
                                                fontWeight: 500
                                            }}>
                                                {u.online ? '● Online' : '○ Offline'}
                                            </span>

                                            {u._id !== currentUser._id && (
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button
                                                        onClick={() => handleChangeRole(u._id, u.role, u.name)}
                                                        style={s.smallBtn}
                                                        title={u.role === 'admin' ? 'Demote' : 'Make Admin'}
                                                    >
                                                        {u.role === 'admin' ? '↓' : '↑'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleBan(u._id, u.name, u.banned)}
                                                        style={{
                                                            ...s.smallBtn,
                                                            background: u.banned ? '#e0f7f0' : '#fff3e0',
                                                            color: u.banned ? '#00a884' : '#e67e22'
                                                        }}
                                                    >
                                                        {u.banned ? 'Unban' : 'Ban'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(u._id, u.name)}
                                                        style={{ ...s.smallBtn, background: '#ffe8e8', color: '#e74c3c' }}
                                                    >
                                                        Del
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                        {/* Quick Stats / Motivation */}
                        <div style={{ ...s.card, background: 'linear-gradient(135deg, #e8e0ff 0%, #f3e8ff 100%)' }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: '#4a3f6b' }}>You're doing great!</div>
                            <div style={{ fontSize: 13, color: '#7c6b9e', marginTop: 6 }}>
                                Keep the community safe and friendly 💜
                            </div>
                            <div style={{ fontSize: 42, marginTop: 12, textAlign: 'right' }}>🐰</div>
                        </div>

                        {/* Online summary */}
                        <div style={s.card}>
                            <h4 style={{ margin: '0 0 14px', color: '#3d2e6b', fontSize: 15 }}>Online Right Now</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {users.filter(u => u.online).slice(0, 5).map(u => (
                                    <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ ...s.userAvatar, width: 32, height: 32, fontSize: 13 }}>
                                            {u.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1, fontSize: 13, color: '#4a3f6b' }}>{u.name}</div>
                                        <span style={{ fontSize: 11, color: '#00a884' }}>●</span>
                                    </div>
                                ))}
                                {users.filter(u => u.online).length === 0 && (
                                    <div style={{ color: '#a89bc4', fontSize: 13 }}>No one is online</div>
                                )}
                            </div>
                        </div>

                        {/* Quick actions */}
                        <div style={s.card}>
                            <h4 style={{ margin: '0 0 12px', color: '#3d2e6b', fontSize: 15 }}>Quick Actions</h4>
                            <button
                                onClick={() => setFilter('banned')}
                                style={{ ...s.quickBtn, background: '#ffe8e8', color: '#e74c3c' }}
                            >
                                View Banned Users
                            </button>
                            <button
                                onClick={() => setFilter('admin')}
                                style={{ ...s.quickBtn, background: '#e8e0ff', color: '#6b4eff', marginTop: 8 }}
                            >
                                Manage Admins
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// ---------- Stat Card ----------
function StatCard({ color, icon, label, value, sub }) {
    return (
        <div style={{ ...s.statCard, background: color }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ fontSize: 13, color: '#6b5b8a', marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: '#3d2e6b' }}>{value}</div>
                    {sub && <div style={{ fontSize: 12, color: '#8b7cb0', marginTop: 4 }}>{sub}</div>}
                </div>
                <div style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: 'rgba(255,255,255,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18
                }}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

// ---------- Styles (soft pastel theme) ----------
const s = {
    page: {
        display: 'flex',
        minHeight: '100vh',
        background: '#faf8ff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#3d2e6b'
    },
    sidebar: {
        width: 240,
        background: 'linear-gradient(180deg, #e8e0ff 0%, #f3e8ff 100%)',
        padding: '28px 18px',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #e0d6f5'
    },
    profileBox: {
        textAlign: 'center',
        padding: '8px 0 16px'
    },
    avatarBig: {
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #c4b5fd, #a78bfa)',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 28,
        fontWeight: 700,
        color: '#fff',
        boxShadow: '0 8px 20px rgba(167, 139, 250, 0.3)'
    },
    navBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        border: 'none',
        borderRadius: 14,
        background: 'transparent',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 500,
        textAlign: 'left',
        transition: 'all 0.2s'
    },
    plantCard: {
        marginTop: 'auto',
        background: 'rgba(255,255,255,0.6)',
        borderRadius: 18,
        padding: '16px',
        textAlign: 'center'
    },
    main: {
        flex: 1,
        padding: '28px 36px',
        overflowY: 'auto'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 28
    },
    greeting: {
        margin: 0,
        fontSize: 26,
        fontWeight: 700,
        color: '#3d2e6b'
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        border: 'none',
        background: '#fff',
        boxShadow: '0 2px 8px rgba(107, 78, 255, 0.08)',
        cursor: 'pointer',
        fontSize: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    statsRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        marginBottom: 24
    },
    statCard: {
        borderRadius: 18,
        padding: '18px 20px',
        boxShadow: '0 4px 16px rgba(107, 78, 255, 0.06)'
    },
    contentGrid: {
        display: 'grid',
        gridTemplateColumns: '1.6fr 1fr',
        gap: 20
    },
    card: {
        background: '#fff',
        borderRadius: 20,
        padding: '22px',
        boxShadow: '0 4px 20px rgba(107, 78, 255, 0.06)'
    },
    chip: {
        padding: '6px 12px',
        borderRadius: 20,
        border: 'none',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer'
    },
    searchInput: {
        width: '100%',
        padding: '11px 16px',
        borderRadius: 12,
        border: '1px solid #e8e0ff',
        background: '#faf8ff',
        outline: 'none',
        fontSize: 14,
        color: '#3d2e6b'
    },
    userRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 8px',
        borderRadius: 12,
        marginBottom: 4,
        transition: 'background 0.15s'
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #c4b5fd, #a78bfa)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 700,
        fontSize: 15,
        overflow: 'hidden',
        flexShrink: 0
    },
    adminBadge: {
        marginLeft: 8,
        fontSize: 10,
        background: '#e0f7f0',
        color: '#00a884',
        padding: '2px 8px',
        borderRadius: 10,
        fontWeight: 600
    },
    bannedBadge: {
        marginLeft: 6,
        fontSize: 10,
        background: '#ffe8e8',
        color: '#e74c3c',
        padding: '2px 8px',
        borderRadius: 10,
        fontWeight: 600
    },
    smallBtn: {
        padding: '5px 10px',
        borderRadius: 8,
        border: 'none',
        background: '#f3f0ff',
        color: '#6b4eff',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer'
    },
    quickBtn: {
        width: '100%',
        padding: '12px',
        borderRadius: 12,
        border: 'none',
        fontWeight: 500,
        fontSize: 13,
        cursor: 'pointer',
        textAlign: 'left'
    }
};

export default AdminDashboard;