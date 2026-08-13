import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import socket from '../utils/socket';
import '../styles/Home.css';
import { API_BASE_URL } from '../config';

// ============================================================
// MESSAGE TICKS
// ============================================================
const MessageTicks = ({ senderId, userId, delivered, read }) => {
  const readReceiptsEnabled = localStorage.getItem('readReceipts') !== 'false';
  if (senderId !== userId || !readReceiptsEnabled) return null;
  if (read) return <span className="hm-ticks hm-ticks-read">✓✓</span>;
  if (delivered) return <span className="hm-ticks hm-ticks-delivered">✓✓</span>;
  return <span className="hm-ticks">✓</span>;
};

// ============================================================
// AVATAR
// ============================================================
const Avatar = ({ person, isGroup = false, online = false, className = '' }) => (
  <div className={`hm-avatar ${className}`}>
    {person?.avatar ? (
      <img src={person.avatar} alt={person.name} className="hm-avatar-img" />
    ) : (
      person?.name?.charAt(0).toUpperCase() || (isGroup ? 'S' : '?')
    )}
    {online && <span className="hm-online-dot" />}
  </div>
);

function Home() {
  // ===================== STATE (unchanged logic) =====================
  const [friends, setFriends] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inbox'); // changed default
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
  const [openMsgMenu, setOpenMsgMenu] = useState(null);
  const CLOUDINARY_CLOUD = 'daaiil1ah';
  const CLOUDINARY_PRESET = 'Connecthub';
  const [uploadingImage, setUploadingImage] = useState(false);
  const chatFileInputRef = useRef(null);
  const [unreadCounts, setUnreadCounts] = useState({});

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingClearRef = useRef(null);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // ===== Mobile navbar hide (kept) =====
  useEffect(() => {
    const navbar = document.querySelector('.side-bar');
    if (!navbar) return;
    const isMobileScreen = window.innerWidth <= 768;
    if (isMobileChatOpen && isMobileScreen) {
      navbar.style.display = 'none';
    } else {
      navbar.style.display = '';
    }
    return () => { navbar.style.display = ''; };
  }, [isMobileChatOpen]);

  // ===== Theme =====
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleThemeChange = () => {
      const newTheme = localStorage.getItem('theme') || 'dark';
      setTheme(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    };
    window.addEventListener('storage', handleThemeChange);
    return () => window.removeEventListener('storage', handleThemeChange);
  }, []);

  const getSetting = (key, defaultValue = true) => {
    const value = localStorage.getItem(key);
    if (value === null) return defaultValue;
    return value !== 'false';
  };

  const enterToSend = getSetting('enterToSend', true);
  const typingEnabled = getSetting('typingStatus', true);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [messages, groupMessages]);

  // ===== FETCH (unchanged) =====
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

  // ===== TAB SWITCH =====
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    if (tab === 'discover') fetchDiscoverUsers();
    if (tab === 'invites') fetchPendingRequests();
    if (tab === 'spaces') fetchGroups();
  };

  // ===== FRIEND ACTIONS (unchanged) =====
  const sendFriendRequest = async (receiverId) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/friends/request`, { receiverId }, authHeaders);
      setDiscoverUsers(prev => prev.filter(u => u._id !== receiverId));
      showNotification(res.data.message || 'Invite sent!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to send invite', 'error');
    }
  };

  const removeFriend = async (friendId) => {
    const confirmed = window.confirm('Remove this connection? Chat history will be deleted.');
    if (!confirmed) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/friends/remove/${friendId}`, authHeaders);
      setFriends(prev => prev.filter(f => f._id !== friendId));
      if (selectedChat?._id === friendId) {
        setSelectedChat(null);
        setMessages([]);
        setIsMobileChatOpen(false);
      }
      showNotification('Connection removed', 'info');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to remove', 'error');
    }
  };

  const acceptRequest = async (requestId) => {
    try {
      await axios.put(`${API_BASE_URL}/api/friends/accept/${requestId}`, {}, authHeaders);
      setPendingRequests(prev => prev.filter(r => r._id !== requestId));
      fetchFriends();
      showNotification('Invite accepted!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to accept', 'error');
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      await axios.put(`${API_BASE_URL}/api/friends/reject/${requestId}`, {}, authHeaders);
      setPendingRequests(prev => prev.filter(r => r._id !== requestId));
      showNotification('Invite declined', 'info');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to decline', 'error');
    }
  };

  // ===== SELECT CHAT / GROUP =====
  const selectChat = async (friend) => {
    setSelectedChat(friend);
    setSelectedGroup(null);
    setMessages([]);
    setTypingUser(null);
    setIsMobileChatOpen(true);

    setUnreadCounts(prev => {
      const updated = { ...prev };
      delete updated[friend._id];
      return updated;
    });

    socket.emit('mark-read', { senderId: friend._id });
    try {
      const res = await axios.get(`${API_BASE_URL}/api/messages/${friend._id}`, authHeaders);
      setMessages(res.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

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

  // ===== CREATE SPACE =====
  const toggleMember = (friendId) => {
    setSelectedMembers(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
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
      showNotification('Space created!', 'success');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to create space', 'error');
    }
  };

  // ===== SEND MESSAGE / IMAGE (unchanged logic) =====
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

  const sendImageMessage = (imageUrl) => {
    if (!selectedChat) return;
    socket.emit('private-message', {
      receiverId: selectedChat._id,
      text: '',
      image: imageUrl
    });

    setMessages(prev => [...prev, {
      senderId: user._id,
      text: '',
      image: imageUrl,
      time: new Date().toLocaleTimeString(),
      delivered: false,
      read: false,
      _id: Date.now()
    }]);

    setFriends(prev => {
      const updated = prev.map(f =>
        f._id === selectedChat._id ? { ...f, lastMessage: '📷 Photo', time: 'Just now' } : f
      );
      const idx = updated.findIndex(f => f._id === selectedChat._id);
      if (idx > -1) {
        const [chat] = updated.splice(idx, 1);
        return [chat, ...updated];
      }
      return updated;
    });
  };

  const uploadChatImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showNotification('Please select an image', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { showNotification('Image must be under 5MB', 'error'); return; }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_PRESET);
      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
        formData
      );
      sendImageMessage(res.data.secure_url);
    } catch {
      showNotification('Image upload failed', 'error');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

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

  const deleteMessage = async (messageId, forEveryone) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/messages/${messageId}`, {
        ...authHeaders,
        data: { forEveryone }
      });
      setMessages(prev =>
        forEveryone
          ? prev.map(m => m._id === messageId ? { ...m, text: 'This message was deleted', deletedForEveryone: true } : m)
          : prev.filter(m => m._id !== messageId)
      );
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to delete message', 'error');
    }
  };

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

  // ===== SOCKET (kept as-is) =====
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

  useEffect(() => {
    const handleNewMessage = (message) => {
      if (message.sender === user._id) return;

      if (selectedChat && message.sender === selectedChat._id) {
        setMessages(prev => [...prev, {
          _id: message._id,
          senderId: message.sender,
          text: message.text,
          image: message.image,
          time: new Date().toLocaleTimeString(),
          delivered: true,
          read: false
        }]);
        socket.emit('mark-read', { senderId: message.sender });
      } else {
        setUnreadCounts(prev => ({
          ...prev,
          [message.sender]: (prev[message.sender] || 0) + 1
        }));
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
      if (!typingEnabled) return;
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

  const filteredFriends = friends.filter(f =>
    f.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="hm-loading"><div className="hm-spinner"></div></div>;
  }

  // ============================================================
  // RENDER — NEW UI
  // ============================================================
  return (
    <>
      {notification.show && (
        <div className={`hm-notification hm-notification-${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="hm-page">
        {/* ===== LEFT PANEL ===== */}
        <div className={`hm-sidebar ${isMobileChatOpen ? 'hm-sidebar-hidden' : ''}`}>
          {/* Brand + user */}
          <div className="hm-sidebar-top">
            <div className="hm-brand">
              {/* <img
                src="https://res.cloudinary.com/daaiil1ah/image/upload/v1784995479/free-whatsapp-logo-icon-4456-thumb_cvjd7y.png"
                alt="ConnectHub"
              /> */}
              <span>ConnectHub</span>
            </div>
          </div>

          {/* Search */}
          <div className="hm-search">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Navigation Tabs */}
          <div className="hm-nav">
            <button
              className={`hm-nav-item ${activeTab === 'inbox' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('inbox')}
            >
              <span className="hm-nav-icon">💬</span>
              <span>Inbox</span>
            </button>
            <button
              className={`hm-nav-item ${activeTab === 'discover' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('discover')}
            >
              <span className="hm-nav-icon">🔍</span>
              <span>Discover</span>
            </button>
            <button
              className={`hm-nav-item ${activeTab === 'invites' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('invites')}
            >
              <span className="hm-nav-icon">✉️</span>
              <span>Invites</span>
              {pendingRequests.length > 0 && (
                <span className="hm-badge">{pendingRequests.length}</span>
              )}
            </button>
            <button
              className={`hm-nav-item ${activeTab === 'spaces' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('spaces')}
            >
              <span className="hm-nav-icon">⬡</span>
              <span>Spaces</span>
            </button>
          </div>

          {/* List */}
          <div className="hm-list">
            {/* INBOX */}
            {activeTab === 'inbox' && (
              filteredFriends.length === 0 ? (
                <div className="hm-empty">
                  <div className="hm-empty-icon">💬</div>
                  <h3>No conversations yet</h3>
                  <p>Go to Discover to find people and start talking</p>
                </div>
              ) : (
                filteredFriends.map(friend => (
                  <div
                    key={friend._id}
                    className={`hm-item ${selectedChat?._id === friend._id ? 'active' : ''}`}
                    onClick={() => selectChat(friend)}
                  >
                    <Avatar person={friend} online={friend.online} />
                    <div className="hm-item-body">
                      <div className="hm-item-row">
                        <span className="hm-item-name">{friend.name}</span>
                        <span className="hm-item-time">{friend.time || ''}</span>
                      </div>
                      <div className="hm-item-row">
                        <span className="hm-item-preview">{friend.lastMessage || 'Start a conversation'}</span>
                        {unreadCounts[friend._id] > 0 && (
                          <span className="hm-unread">
                            {unreadCounts[friend._id] > 99 ? '99+' : unreadCounts[friend._id]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )
            )}

            {/* DISCOVER */}
            {activeTab === 'discover' && (
              discoverUsers.length === 0 ? (
                <div className="hm-empty">
                  <div className="hm-empty-icon">🔍</div>
                  <h3>No one new right now</h3>
                  <p>Check back later or invite friends</p>
                </div>
              ) : (
                discoverUsers.map(u => (
                  <div key={u._id} className="hm-item">
                    <Avatar person={u} />
                    <div className="hm-item-body">
                      <div className="hm-item-name">{u.name}</div>
                      <div className="hm-item-preview">{u.email}</div>
                    </div>
                    <button
                      className="hm-action-btn"
                      onClick={(e) => { e.stopPropagation(); sendFriendRequest(u._id); }}
                    >
                      Connect
                    </button>
                  </div>
                ))
              )
            )}

            {/* INVITES */}
            {activeTab === 'invites' && (
              pendingRequests.length === 0 ? (
                <div className="hm-empty">
                  <div className="hm-empty-icon">✉️</div>
                  <h3>No pending invites</h3>
                  <p>When someone wants to connect, it will show here</p>
                </div>
              ) : (
                pendingRequests.map(req => (
                  <div key={req._id} className="hm-item">
                    <Avatar person={req.sender} />
                    <div className="hm-item-body">
                      <div className="hm-item-name">{req.sender?.name}</div>
                      <div className="hm-item-preview">{req.sender?.email}</div>
                    </div>
                    <div className="hm-invite-actions">
                      <button className="hm-accept" onClick={() => acceptRequest(req._id)}>✓</button>
                      <button className="hm-decline" onClick={() => rejectRequest(req._id)}>✕</button>
                    </div>
                  </div>
                ))
              )
            )}

            {/* SPACES */}
            {activeTab === 'spaces' && (
              <>
                <div className="hm-list-header">
                  <button className="hm-create-space" onClick={() => setShowCreateGroup(true)}>
                    + New Space
                  </button>
                </div>
                {groups.length === 0 ? (
                  <div className="hm-empty">
                    <div className="hm-empty-icon">⬡</div>
                    <h3>No spaces yet</h3>
                    <p>Create a space for your team, friends or community</p>
                  </div>
                ) : (
                  groups.map(group => (
                    <div
                      key={group._id}
                      className={`hm-item ${selectedGroup?._id === group._id ? 'active' : ''}`}
                      onClick={() => selectGroup(group)}
                    >
                      <Avatar person={group} isGroup className="hm-avatar-group" />
                      <div className="hm-item-body">
                        <div className="hm-item-name">{group.name}</div>
                        <div className="hm-item-preview">
                          {group.members?.length || 0} members
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>

        {/* ===== CHAT PANE ===== */}
        <div className={`hm-chat ${isMobileChatOpen ? 'hm-chat-open' : ''}`}>
          {selectedGroup ? (
            <>
              <div className="hm-chat-header">
                <button className="hm-back" onClick={goBackToChats}>←</button>
                <Avatar person={selectedGroup} isGroup className="hm-avatar-group" />
                <div className="hm-chat-meta">
                  <div className="hm-chat-name">{selectedGroup.name}</div>
                  <div className="hm-chat-sub">{selectedGroup.members?.length} members</div>
                </div>
              </div>

              <div className="hm-messages">
                {groupMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`hm-msg ${msg.senderId === user._id ? 'sent' : 'received'}`}
                  >
                    <div className="hm-bubble">
                      {msg.senderId !== user._id && (
                        <div className="hm-sender">{msg.senderName}</div>
                      )}
                      {msg.text}
                      <span className="hm-time">{msg.time}</span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="hm-composer">
                <input
                  type="text"
                  placeholder="Message this space..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (enterToSend && e.key === 'Enter') sendGroupMessage();
                  }}
                />
                <button className="hm-send" onClick={sendGroupMessage}>
                  <i className="bx bx-send"></i>
                </button>
              </div>
            </>
          ) : selectedChat ? (
            <>
              <div className="hm-chat-header">
                <button className="hm-back" onClick={goBackToChats}>←</button>
                <Avatar person={selectedChat} online={selectedChat.online} />
                <div className="hm-chat-meta">
                  <div className="hm-chat-name">{selectedChat.name}</div>
                  <div className="hm-chat-sub">
                    {typingUser
                      ? <span className="hm-typing">{typingUser} is typing…</span>
                      : selectedChat.online ? 'Online' : 'Offline'}
                  </div>
                </div>
                <button
                  className="hm-more"
                  onClick={() => removeFriend(selectedChat._id)}
                  title="Remove connection"
                >
                  <i className="bx bx-user-x"></i>
                </button>
              </div>

              <div className="hm-messages">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`hm-msg ${msg.senderId === user._id ? 'sent' : 'received'}`}
                  >
                    <div className="hm-bubble">
                      <button
                        className="hm-msg-menu-btn"
                        onClick={() => setOpenMsgMenu(openMsgMenu === msg._id ? null : msg._id)}
                      >
                        ⋮
                      </button>

                      {openMsgMenu === msg._id && (
                        <div className="hm-msg-menu">
                          <button onClick={() => { deleteMessage(msg._id, false); setOpenMsgMenu(null); }}>
                            Delete for me
                          </button>
                          {msg.senderId === user._id && (
                            <button onClick={() => { deleteMessage(msg._id, true); setOpenMsgMenu(null); }}>
                              Delete for everyone
                            </button>
                          )}
                        </div>
                      )}

                      {msg.image && (
                        <img src={msg.image} alt="shared" className="hm-msg-image" />
                      )}
                      {msg.text}
                      <span className="hm-time">
                        <MessageTicks
                          senderId={msg.senderId}
                          userId={user._id}
                          delivered={msg.delivered}
                          read={msg.read}
                        />
                        {msg.time}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="hm-composer">
                <button
                  className="hm-attach"
                  onClick={() => chatFileInputRef.current.click()}
                  disabled={uploadingImage}
                  title="Send image"
                >
                  {uploadingImage ? '⏳' : '📎'}
                </button>
                <input
                  ref={chatFileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={uploadChatImage}
                />
                <input
                  type="text"
                  placeholder="Write a message..."
                  value={newMessage}
                  onChange={handleTyping}
                  onKeyPress={(e) => {
                    if (enterToSend && e.key === 'Enter') sendMessage();
                  }}
                />
                <button className="hm-send" onClick={sendMessage}>
                  <i className="bx bx-send"></i>
                </button>
              </div>
            </>
          ) : (
            <div className="hm-empty-chat">
              <div className="hm-empty-chat-icon">💬</div>
              <h2>Select a conversation</h2>
              <p>Choose someone from your Inbox or open a Space to start messaging</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== NEW SPACE MODAL ===== */}
      {showCreateGroup && (
        <div className="hm-modal-overlay" onClick={() => setShowCreateGroup(false)}>
          <div className="hm-modal" onClick={e => e.stopPropagation()}>
            <div className="hm-modal-header">
              <h3>New Space</h3>
              <button onClick={() => setShowCreateGroup(false)}>✕</button>
            </div>
            <input
              type="text"
              placeholder="Space name..."
              className="hm-modal-input"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
            />
            <p className="hm-modal-label">Select members</p>
            <div className="hm-modal-list">
              {friends.length === 0 ? (
                <p className="hm-modal-empty">Add connections first</p>
              ) : (
                friends.map(friend => (
                  <div
                    key={friend._id}
                    className={`hm-item ${selectedMembers.includes(friend._id) ? 'selected' : ''}`}
                    onClick={() => toggleMember(friend._id)}
                  >
                    <Avatar person={friend} />
                    <div className="hm-item-body">
                      <div className="hm-item-name">{friend.name}</div>
                    </div>
                    {selectedMembers.includes(friend._id) && (
                      <span className="hm-check">✓</span>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="hm-modal-footer">
              <button
                className="hm-create-btn"
                onClick={createGroup}
                disabled={!groupName.trim() || selectedMembers.length === 0}
              >
                Create Space {selectedMembers.length > 0 && `(${selectedMembers.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Home;