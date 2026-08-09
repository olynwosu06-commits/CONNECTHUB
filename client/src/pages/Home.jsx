import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import socket from '../utils/socket';
import '../styles/Home.css';
import { API_BASE_URL } from '../config';

// ============================================================
// MESSAGE TICKS COMPONENT (with Read Receipts toggle)
// ============================================================
const MessageTicks = ({ senderId, userId, delivered, read }) => {
    // ✅ Check if read receipts are enabled
    const readReceiptsEnabled = localStorage.getItem('readReceipts') !== 'false';
    
    if (senderId !== userId) return null;
    if (!readReceiptsEnabled) return null;
    if (read) return <span className="hm-ticks hm-ticks-read">✓✓</span>;
    if (delivered) return <span className="hm-ticks hm-ticks-delivered">✓✓</span>;
    return <span className="hm-ticks">✓</span>;
};

// ============================================================
// AVATAR COMPONENT
// ============================================================
const Avatar = ({ person, isGroup = false, online = false, className = '' }) => (
    <div className={`hm-avatar ${className}`}>
        {person?.avatar ? (
            <img src={person.avatar} alt={person.name} className="hm-avatar-img" />
        ) : (
            person?.name?.charAt(0).toUpperCase() || (isGroup ? 'G' : '?')
        )}
        {online && <span className="hm-online-dot" />}
    </div>
);

function Home() {
    // ============================================================
    // STATE
    // ============================================================
    const [friends, setFriends] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('chats');
    const [discoverUsers, setDiscoverUsers] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [typingUser, setTypingUser] = useState(null);
    const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [groupMessages, setGroupMessages] = useState([]);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);

    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const typingClearRef = useRef(null);
    const navigate = useNavigate();

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };


    useEffect(() => {
    const navbar = document.querySelector('.side-bar');
    if (!navbar) return;

    if (isMobileChatOpen) {
        navbar.style.display = 'none';
    } else {
        navbar.style.display = '';
    }

    return () => {
        navbar.style.display = '';
    };
}, [isMobileChatOpen]);

    // ============================================================
    // THEME SYNC ✅
    // ============================================================
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // Listen for theme changes from Settings page
    useEffect(() => {
        const handleThemeChange = () => {
            const newTheme = localStorage.getItem('theme') || 'dark';
            setTheme(newTheme);
            document.documentElement.setAttribute('data-theme', newTheme);
        };
        window.addEventListener('storage', handleThemeChange);
        return () => window.removeEventListener('storage', handleThemeChange);
    }, []);

    // ============================================================
    // SETTINGS HELPERS ✅
    // ============================================================
    const getSetting = (key, defaultValue = true) => {
        const value = localStorage.getItem(key);
        if (value === null) return defaultValue;
        return value !== 'false';
    };

    const enterToSend = getSetting('enterToSend', true);
    const typingEnabled = getSetting('typingStatus', true);

    // ============================================================
    // NOTIFICATION
    // ============================================================
    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    };

    // ============================================================
    // AUTO SCROLL
    // ============================================================
    useEffect(() => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }, [messages, groupMessages]);

    // ============================================================
    // FETCH DATA
    // ============================================================
    const fetchFriends = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/friends/list`, authHeaders);
            setFriends(res.data);
        } catch (error) {
            console.error('Error fetching friends:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDiscoverUsers = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/friends/discover`, authHeaders);
            setDiscoverUsers(res.data);
        } catch (error) {
            console.error('Error fetching discover users:', error);
        }
    };

    const fetchPendingRequests = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/friends/pending`, authHeaders);
            setPendingRequests(res.data);
        } catch (error) {
            console.error('Error fetching requests:', error);
        }
    };

    const fetchGroups = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/groups/my-groups`, authHeaders);
            setGroups(res.data);
        } catch (error) {
            console.error('Error fetching groups:', error);
        }
    };

    useEffect(() => {
        if (token) fetchFriends();
        else setLoading(false);
    }, []);

    // ============================================================
    // TAB SWITCH
    // ============================================================
    const handleTabSwitch = (tab) => {
        setActiveTab(tab);
        if (tab === 'people') fetchDiscoverUsers();
        if (tab === 'requests') fetchPendingRequests();
        if (tab === 'groups') fetchGroups();
    };

    // ============================================================
    // FRIEND REQUESTS
    // ============================================================
    const sendFriendRequest = async (receiverId) => {
        try {
            const res = await axios.post(`${API_BASE_URL}/api/friends/request`, { receiverId }, authHeaders);
            setDiscoverUsers(prev => prev.filter(u => u._id !== receiverId));
            showNotification(res.data.message || 'Friend request sent!', 'success');
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to send request', 'error');
        }
    };

    const acceptRequest = async (requestId) => {
        try {
            await axios.put(`${API_BASE_URL}/api/friends/accept/${requestId}`, {}, authHeaders);
            setPendingRequests(prev => prev.filter(r => r._id !== requestId));
            fetchFriends();
            showNotification('Friend request accepted!', 'success');
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to accept', 'error');
        }
    };

    const rejectRequest = async (requestId) => {
        try {
            await axios.put(`${API_BASE_URL}/api/friends/reject/${requestId}`, {}, authHeaders);
            setPendingRequests(prev => prev.filter(r => r._id !== requestId));
            showNotification('Request rejected', 'info');
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to reject', 'error');
        }
    };

    // ============================================================
    // SELECT PRIVATE CHAT
    // ============================================================
    const selectChat = async (friend) => {
        setSelectedChat(friend);
        setSelectedGroup(null);
        setMessages([]);
        setTypingUser(null);
        setIsMobileChatOpen(true);
        socket.emit('mark-read', { senderId: friend._id });
        try {
            const res = await axios.get(`${API_BASE_URL}/api/messages/${friend._id}`, authHeaders);
            setMessages(res.data);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    // ============================================================
    // SELECT GROUP CHAT
    // ============================================================
    const selectGroup = async (group) => {
        setSelectedGroup(group);
        setSelectedChat(null);
        setGroupMessages([]);
        setIsMobileChatOpen(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/groups/${group._id}/messages`, authHeaders);
            setGroupMessages(res.data);
            socket.emit('join-group', group._id);
        } catch (error) {
            console.error('Error fetching group messages:', error);
        }
    };

    // ============================================================
    // CREATE GROUP
    // ============================================================
    const toggleMember = (friendId) => {
        setSelectedMembers(prev =>
            prev.includes(friendId)
                ? prev.filter(id => id !== friendId)
                : [...prev, friendId]
        );
    };

    const createGroup = async () => {
        if (!groupName.trim() || selectedMembers.length === 0) return;
        try {
            const res = await axios.post(`${API_BASE_URL}/api/groups/create`, {
                name: groupName, members: selectedMembers
            }, authHeaders);
            setGroups(prev => [...prev, res.data.group]);
            setShowCreateGroup(false);
            setGroupName('');
            setSelectedMembers([]);
            showNotification('Group created!', 'success');
        } catch (error) {
            showNotification(error.response?.data?.message || 'Failed to create group', 'error');
        }
    };

    // ============================================================
    // SEND PRIVATE MESSAGE
    // ============================================================
    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedChat) return;
        const sentText = newMessage.trim();

        socket.emit('private-message', { 
            receiverId: selectedChat._id, 
            text: sentText 
        });

        setMessages(prev => [...prev, {
            senderId: user._id,
            text: sentText,
            time: new Date().toLocaleTimeString(),
            delivered: false,
            read: false,
            _id: Date.now()
        }]);

        setFriends(prev => {
            const updated = prev.map(f =>
                f._id === selectedChat._id ? { ...f, lastMessage: sentText, time: 'Just now' } : f
            );
            const idx = updated.findIndex(f => f._id === selectedChat._id);
            if (idx > -1) {
                const [chat] = updated.splice(idx, 1);
                return [chat, ...updated];
            }
            return updated;
        });

        setNewMessage('');
    };

    // ============================================================
    // SEND GROUP MESSAGE
    // ============================================================
    const sendGroupMessage = async () => {
        if (!newMessage.trim() || !selectedGroup) return;
        const sentText = newMessage.trim();

        socket.emit('group-message', { 
            groupId: selectedGroup._id, 
            text: sentText 
        });

        setGroupMessages(prev => [...prev, {
            senderId: user._id,
            senderName: 'You',
            text: sentText,
            time: new Date().toLocaleTimeString(),
            _id: Date.now()
        }]);

        setGroups(prev => {
            const updated = prev.map(g =>
                g._id === selectedGroup._id ? { ...g, lastMessage: sentText, time: 'Just now' } : g
            );
            const idx = updated.findIndex(g => g._id === selectedGroup._id);
            if (idx > -1) {
                const [group] = updated.splice(idx, 1);
                return [group, ...updated];
            }
            return updated;
        });

        setNewMessage('');
    };

    // ============================================================
    // TYPING (with Typing Status toggle ✅)
    // ============================================================
    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        if (selectedChat?._id && typingEnabled) {
            socket.emit('typing', { receiverId: selectedChat._id, isTyping: true });
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                socket.emit('typing', { receiverId: selectedChat._id, isTyping: false });
            }, 1500);
        }
    };

    // ============================================================
    // LOGOUT + BACK
    // ============================================================
    const handleLogout = () => {
        socket.disconnect();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const goBackToChats = () => {
        setIsMobileChatOpen(false);
        setSelectedChat(null);
        setSelectedGroup(null);
        setTypingUser(null);
    };

    // ============================================================
    // SOCKET — connect once on mount
    // ============================================================
    useEffect(() => {
        if (!token || !user._id) return;
        socket.auth = { token };
        socket.connect();

        socket.on('connect', () => console.log('✅ Socket connected'));
        socket.on('connect_error', (err) => console.error('❌ Socket error:', err.message));
        socket.on('online-users', (onlineUsers) => {
            setFriends(prev => prev.map(f => ({
                ...f, online: onlineUsers.some(u => u.userId === f._id)
            })));
        });

        return () => {
            socket.off('connect');
            socket.off('connect_error');
            socket.off('online-users');
            socket.disconnect();
        };
    }, []);

    // ============================================================
    // SOCKET — messages, typing, read receipts
    // ============================================================
    useEffect(() => {
        const handleNewMessage = (message) => {
            if (message.sender === user._id) return;
            if (selectedChat && message.sender === selectedChat._id) {
                setMessages(prev => [...prev, {
                    senderId: message.sender,
                    text: message.text,
                    time: new Date().toLocaleTimeString(),
                    delivered: true,
                    read: false
                }]);
                socket.emit('mark-read', { senderId: message.sender });
            }
            setFriends(prev => {
                const updated = prev.map(f =>
                    f._id === message.sender
                        ? { ...f, lastMessage: message.text, time: 'Just now' }
                        : f
                );
                const idx = updated.findIndex(f => f._id === message.sender);
                if (idx === -1) return updated;
                const [chat] = updated.splice(idx, 1);
                return [chat, ...updated];
            });
        };

        const handleNewGroupMessage = (message) => {
            if (message.sender === user._id) return;
            if (selectedGroup && message.groupId === selectedGroup._id) {
                setGroupMessages(prev => [...prev, {
                    senderId: message.sender,
                    senderName: message.senderName || 'Member',
                    text: message.text,
                    time: new Date().toLocaleTimeString()
                }]);
            }
        };

        const handleTypingEvent = ({ userId, isTyping }) => {
            if (!typingEnabled) return; // ✅ Check typing toggle
            if (selectedChat && userId === selectedChat._id) {
                if (isTyping) {
                    clearTimeout(typingClearRef.current);
                    setTypingUser(selectedChat.name);
                    typingClearRef.current = setTimeout(() => setTypingUser(null), 3000);
                } else {
                    clearTimeout(typingClearRef.current);
                    setTypingUser(null);
                }
            }
        };

        const handleMessagesRead = ({ by }) => {
            if (selectedChat && by === selectedChat._id) {
                setMessages(prev => prev.map(msg =>
                    msg.senderId === user._id ? { ...msg, read: true, delivered: true } : msg
                ));
            }
        };

        const handleMessageSent = (message) => {
            setMessages(prev => prev.map((msg, idx) =>
                idx === prev.length - 1 && msg.senderId === user._id
                    ? { ...msg, delivered: message.delivered || false }
                    : msg
            ));
        };

        socket.on('new-message', handleNewMessage);
        socket.on('new-group-message', handleNewGroupMessage);
        socket.on('typing', handleTypingEvent);
        socket.on('messages-read', handleMessagesRead);
        socket.on('message-sent', handleMessageSent);

        return () => {
            socket.off('new-message', handleNewMessage);
            socket.off('new-group-message', handleNewGroupMessage);
            socket.off('typing', handleTypingEvent);
            socket.off('messages-read', handleMessagesRead);
            socket.off('message-sent', handleMessageSent);
        };
    }, [selectedChat, selectedGroup]);

    // ============================================================
    // FILTER
    // ============================================================
    const filteredFriends = friends.filter(f =>
        f.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return <div className="hm-loading"><div className="hm-spinner"></div></div>;
    }

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <>
            {notification.show && (
                <div className={`hm-notification hm-notification-${notification.type}`}>
                    {notification.message}
                </div>
            )}

            <div className="hm-page">

                {/* ===== SIDEBAR ===== */}
                <div className={`hm-sidebar ${isMobileChatOpen ? 'hm-sidebar-hidden' : ''}`}>
                    <div className="hm-sidebar-header">
                        <h2>Connecthub</h2>
                    </div>

                    <div className="hm-search">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="hm-tabs">
                        <button className={activeTab === 'chats' ? 'hm-tab active' : 'hm-tab'} onClick={() => handleTabSwitch('chats')}>Chats</button>
                        <button className={activeTab === 'people' ? 'hm-tab active' : 'hm-tab'} onClick={() => handleTabSwitch('people')}>People</button>
                        <button className={activeTab === 'requests' ? 'hm-tab active' : 'hm-tab'} onClick={() => handleTabSwitch('requests')}>
                            Requests
                            {pendingRequests.length > 0 && <span className="hm-badge">{pendingRequests.length}</span>}
                        </button>
                        <button className={activeTab === 'groups' ? 'hm-tab active' : 'hm-tab'} onClick={() => handleTabSwitch('groups')}>Groups</button>
                    </div>

                    <div className="hm-list">

                        {/* CHATS TAB */}
                        {activeTab === 'chats' && (
                            filteredFriends.length === 0 ? (
                                <div className="hm-empty">
                                    <p>👥</p>
                                    <h3>No friends yet</h3>
                                    <p>Go to People tab to add friends</p>
                                </div>
                            ) : (
                                filteredFriends.map(friend => (
                                    <div
                                        key={friend._id}
                                        className={`hm-item ${selectedChat?._id === friend._id ? 'hm-item-active' : ''}`}
                                        onClick={() => selectChat(friend)}
                                    >
                                        <Avatar person={friend} online={friend.online} />
                                        <div className="hm-item-info">
                                            <div className="hm-item-name">{friend.name}</div>
                                            <div className="hm-item-sub">{friend.lastMessage || 'Say hello! 👋'}</div>
                                        </div>
                                        <div className="hm-item-time">{friend.time || ''}</div>
                                    </div>
                                ))
                            )
                        )}

                        {/* PEOPLE TAB */}
                        {activeTab === 'people' && (
                            discoverUsers.length === 0 ? (
                                <div className="hm-empty"><p>No new people to add!</p></div>
                            ) : (
                                discoverUsers.map(u => (
                                    <div key={u._id} className="hm-item">
                                        <Avatar person={u} />
                                        <div className="hm-item-info">
                                            <div className="hm-item-name">{u.name}</div>
                                            <div className="hm-item-sub">{u.email}</div>
                                        </div>
                                        <button className="hm-add-btn" onClick={(e) => { e.stopPropagation(); sendFriendRequest(u._id); }}>Add</button>
                                    </div>
                                ))
                            )
                        )}

                        {/* REQUESTS TAB */}
                        {activeTab === 'requests' && (
                            pendingRequests.length === 0 ? (
                                <div className="hm-empty"><p>No pending requests</p></div>
                            ) : (
                                pendingRequests.map(req => (
                                    <div key={req._id} className="hm-item">
                                        <Avatar person={req.sender} />
                                        <div className="hm-item-info">
                                            <div className="hm-item-name">{req.sender?.name}</div>
                                            <div className="hm-item-sub">{req.sender?.email}</div>
                                        </div>
                                        <div className="hm-req-actions">
                                            <button className="hm-accept-btn" onClick={() => acceptRequest(req._id)}>✓</button>
                                            <button className="hm-reject-btn" onClick={() => rejectRequest(req._id)}>✕</button>
                                        </div>
                                    </div>
                                ))
                            )
                        )}

                        {/* GROUPS TAB */}
                        {activeTab === 'groups' && (
                            <>
                                <div style={{ padding: '10px 16px' }}>
                                    <button className="hm-add-btn" style={{ width: '100%', borderRadius: '8px', padding: '10px' }} onClick={() => setShowCreateGroup(true)}>
                                        + Create Group
                                    </button>
                                </div>
                                {groups.length === 0 ? (
                                    <div className="hm-empty">
                                        <p>👥</p>
                                        <h3>No groups yet</h3>
                                        <p>Create a group to get started</p>
                                    </div>
                                ) : (
                                    groups.map(group => (
                                        <div
                                            key={group._id}
                                            className={`hm-item ${selectedGroup?._id === group._id ? 'hm-item-active' : ''}`}
                                            onClick={() => selectGroup(group)}
                                        >
                                            <Avatar person={group} isGroup className="hm-avatar-group" />
                                            <div className="hm-item-info">
                                                <div className="hm-item-name">{group.name}</div>
                                                <div className="hm-item-sub">{group.members?.length || 0} members</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* ===== CHAT SCREEN ===== */}
                <div className={`hm-chat ${isMobileChatOpen ? 'hm-chat-open' : ''}`}>

                    {/* GROUP CHAT */}
                    {selectedGroup ? (
                        <>
                            <div className="hm-chat-header">
                                <div className="hm-chat-header-info">
                                    <button className="hm-back-btn" onClick={goBackToChats}>←</button>
                                    <Avatar person={selectedGroup} isGroup className="hm-avatar-group" />
                                    <div>
                                        <div className="hm-chat-name">{selectedGroup.name}</div>
                                        <div className="hm-chat-status">{selectedGroup.members?.length} members</div>
                                    </div>
                                </div>
                            </div>

                            <div className="hm-messages">
                                {groupMessages.map((msg, index) => (
                                    <div key={index} className={`hm-msg ${msg.senderId === user._id ? 'hm-msg-sent' : 'hm-msg-received'}`}>
                                        <div className="hm-msg-bubble">
                                            {msg.senderId !== user._id && <div className="hm-msg-sender">{msg.senderName}</div>}
                                            {msg.text}
                                            <span className="hm-msg-time">{msg.time}</span>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="hm-input-bar">
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (enterToSend && e.key === 'Enter') {
                                            sendGroupMessage();
                                        }
                                    }}
                                />
                                <button className="hm-send-btn" onClick={sendGroupMessage}>
                                    <i className="bx bx-send"></i>
                                </button>
                            </div>
                        </>

                    ) : selectedChat ? (
                        <>
                            <div className="hm-chat-header">
                                <div className="hm-chat-header-info">
                                    <button className="hm-back-btn" onClick={goBackToChats}>←</button>
                                    <Avatar person={selectedChat} online={selectedChat.online} />
                                    <div>
                                        <div className="hm-chat-name">{selectedChat.name}</div>
                                        <div className="hm-chat-status">
                                            {typingUser
                                                ? <span style={{ color: '#00a884' }}>✍️ {typingUser} is typing...</span>
                                                : selectedChat.online ? '🟢 Online' : '⚪ Offline'
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="hm-messages">
                                {messages.map((msg, index) => (
                                    <div key={index} className={`hm-msg ${msg.senderId === user._id ? 'hm-msg-sent' : 'hm-msg-received'}`}>
                                        <div className="hm-msg-bubble">
                                            {msg.text}
                                            <span className="hm-msg-time">
                                                {msg.time}
                                                <MessageTicks
                                                    senderId={msg.senderId}
                                                    userId={user._id}
                                                    delivered={msg.delivered}
                                                    read={msg.read}
                                                />
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="hm-input-bar">
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    value={newMessage}
                                    onChange={handleTyping}
                                    onKeyPress={(e) => {
                                        if (enterToSend && e.key === 'Enter') {
                                            sendMessage();
                                        }
                                    }}
                                />
                                <button className="hm-send-btn" onClick={sendMessage}>
                                    <i className="bx bx-send"></i>
                                </button>
                            </div>
                        </>

                    ) : (
                        <div className="hm-no-chat">
                            <div className="hm-no-chat-icon">💬</div>
                            <h2>Select a chat</h2>
                            <p>Choose a friend or group to start messaging</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ===== CREATE GROUP MODAL ===== */}
            {showCreateGroup && (
                <div className="hm-modal-overlay" onClick={() => setShowCreateGroup(false)}>
                    <div className="hm-modal" onClick={e => e.stopPropagation()}>
                        <div className="hm-modal-header">
                            <h3>Create Group</h3>
                            <button onClick={() => setShowCreateGroup(false)}>✕</button>
                        </div>
                        <input
                            type="text"
                            placeholder="Group name..."
                            className="hm-modal-input"
                            value={groupName}
                            onChange={e => setGroupName(e.target.value)}
                        />
                        <p style={{ padding: '8px 16px', color: 'var(--sidebar-icon)', fontSize: '13px' }}>Select members:</p>
                        <div className="hm-modal-list">
                            {friends.length === 0 ? (
                                <p style={{ padding: '16px', color: 'var(--sidebar-icon)', textAlign: 'center' }}>Add friends first</p>
                            ) : (
                                friends.map(friend => (
                                    <div
                                        key={friend._id}
                                        className="hm-item"
                                        style={{ background: selectedMembers.includes(friend._id) ? 'var(--sidebar-active-bg)' : '' }}
                                        onClick={() => toggleMember(friend._id)}
                                    >
                                        <Avatar person={friend} />
                                        <div className="hm-item-info">
                                            <div className="hm-item-name">{friend.name}</div>
                                        </div>
                                        {selectedMembers.includes(friend._id) && <span style={{ color: '#00a884', fontWeight: 'bold' }}>✓</span>}
                                    </div>
                                ))
                            )}
                        </div>
                        <div style={{ padding: '12px 16px' }}>
                            <button
                                className="hm-add-btn"
                                style={{ width: '100%', borderRadius: '8px', padding: '10px', opacity: (!groupName.trim() || selectedMembers.length === 0) ? 0.5 : 1 }}
                                onClick={createGroup}
                                disabled={!groupName.trim() || selectedMembers.length === 0}
                            >
                                Create Group {selectedMembers.length > 0 && `(${selectedMembers.length})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default Home;