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
  const [friends, setFriends] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inbox');
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
  const [totalUnread, setTotalUnread] = useState(0); // For home icon dot
  
  // ============================================================
  // VOICE RECORDING STATES
  // ============================================================
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordStreamRef = useRef(null);
  const recordTimerRef = useRef(null);
  const MAX_RECORD_SECONDS = 300;

  // Profile editing states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  // New states
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState([]);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingClearRef = useRef(null);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // ============================================================
  // PROFILE FUNCTIONS
  // ============================================================
  const openProfileModal = () => {
    setProfileName(user.name || '');
    setProfileAvatar(user.avatar || '');
    setShowProfileModal(true);
  };

  const updateProfile = async () => {
    try {
      const res = await axios.put(
        `${API_BASE_URL}/api/users/profile`,
        { name: profileName, avatar: profileAvatar },
        authHeaders
      );
      
      // Update local storage
      const updatedUser = { ...user, name: profileName, avatar: profileAvatar };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update state
      setProfileAvatar(profileAvatar);
      setProfileName(profileName);
      
      showNotification('Profile updated successfully!', 'success');
      setShowProfileModal(false);
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to update profile', 'error');
    }
  };

  const uploadProfileAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showNotification('Please select an image', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showNotification('Image must be under 2MB', 'error');
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_PRESET);
      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
        formData
      );
      setProfileAvatar(res.data.secure_url);
      showNotification('Avatar uploaded!', 'success');
    } catch {
      showNotification('Avatar upload failed', 'error');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  // ============================================================
  // MESSAGE DATE HELPER
  // ============================================================
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffDays = Math.floor((today - msgDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Today - show time only
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `${days[date.getDay()]} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  // ============================================================
  // GROUP MESSAGES WITH DATE
  // ============================================================
  const groupMessagesByDate = (messages) => {
    const groups = {};
    messages.forEach(msg => {
      const date = new Date(msg.createdAt || Date.now());
      const key = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
      if (!groups[key]) groups[key] = [];
      groups[key].push(msg);
    });
    return groups;
  };

  const getDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((today - msgDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[date.getDay()];
    }
    return date.toLocaleDateString();
  };

  // ============================================================
  // Mobile navbar hide
  // ============================================================
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

  // Theme
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

  // Fetch
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

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    if (tab === 'discover') fetchDiscoverUsers();
    if (tab === 'invites') {
      fetchPendingRequests();
      // Reset invite notification dot when opening invites
      setShowInviteDot(false);
    }
    if (tab === 'spaces') fetchGroups();
  };

  // ============================================================
  // INVITE NOTIFICATION DOT
  // ============================================================
  const [showInviteDot, setShowInviteDot] = useState(false);

  // Check for pending invites periodically
  useEffect(() => {
    if (activeTab !== 'invites') {
      const checkPending = async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/api/friends/pending`, authHeaders);
          if (res.data.length > 0) {
            setShowInviteDot(true);
          }
        } catch (error) {
          console.error('Error checking invites:', error);
        }
      };
      checkPending();
      
      // Also check via socket for real-time updates
      const handleFriendRequest = (data) => {
        setShowInviteDot(true);
        showNotification('New friend request received!', 'info');
      };
      
      socket.on('friend-request', handleFriendRequest);
      
      return () => {
        socket.off('friend-request', handleFriendRequest);
      };
    }
  }, [activeTab]);

  // Friend actions
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

  // Select chat / group
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

  // Create space
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

  // Helpers
  const isGroupAdmin = (group) => {
    if (!group) return false;
    return group.admin?._id === user._id || group.admin === user._id;
  };

  const startEditMessage = (msg) => {
    setEditingMessageId(msg._id);
    setEditText(msg.text || '');
    setOpenMsgMenu(null);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const saveEditMessage = async () => {
    if (!editText.trim() || !editingMessageId) return;

    try {
      await axios.put(
        `${API_BASE_URL}/api/messages/${editingMessageId}`,
        { text: editText.trim() },
        authHeaders
      );

      if (selectedChat) {
        setMessages(prev =>
          prev.map(m =>
            m._id === editingMessageId ? { ...m, text: editText.trim(), edited: true } : m
          )
        );
      } else if (selectedGroup) {
        setGroupMessages(prev =>
          prev.map(m =>
            m._id === editingMessageId ? { ...m, text: editText.trim(), edited: true } : m
          )
        );
      }

      socket.emit('edit-message', {
        messageId: editingMessageId,
        text: editText.trim(),
        groupId: selectedGroup?._id || null
      });

      cancelEdit();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to edit message', 'error');
    }
  };

  const updateGroupName = async (newName) => {
    if (!selectedGroup || !newName.trim()) return;

    try {
      const res = await axios.put(
        `${API_BASE_URL}/api/groups/${selectedGroup._id}`,
        { name: newName.trim() },
        authHeaders
      );

      const updatedGroup = res.data.group;
      setSelectedGroup(updatedGroup);
      setGroups(prev =>
        prev.map(g => (g._id === selectedGroup._id ? updatedGroup : g))
      );
      showNotification('Space name updated', 'success');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update space', 'error');
    }
  };

  const toggleMemberToAdd = (friendId) => {
    setSelectedToAdd(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const addMembersToGroup = async () => {
    if (!selectedGroup || selectedToAdd.length === 0) return;

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/groups/${selectedGroup._id}/members`,
        { members: selectedToAdd },
        authHeaders
      );

      setSelectedGroup(res.data.group);
      setGroups(prev =>
        prev.map(g => (g._id === selectedGroup._id ? res.data.group : g))
      );

      const msgRes = await axios.get(
        `${API_BASE_URL}/api/groups/${selectedGroup._id}/messages`,
        authHeaders
      );
      setGroupMessages(msgRes.data);

      setShowAddMembers(false);
      setSelectedToAdd([]);
      showNotification('Members added', 'success');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to add members', 'error');
    }
  };

  const removeMemberFromGroup = async (memberId) => {
    if (!selectedGroup) return;

    try {
      const res = await axios.delete(
        `${API_BASE_URL}/api/groups/${selectedGroup._id}/members/${memberId}`,
        authHeaders
      );

      setSelectedGroup(res.data.group);
      setGroups(prev =>
        prev.map(g => (g._id === selectedGroup._id ? res.data.group : g))
      );

      const msgRes = await axios.get(
        `${API_BASE_URL}/api/groups/${selectedGroup._id}/messages`,
        authHeaders
      );
      setGroupMessages(msgRes.data);

      showNotification('Member removed', 'success');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to remove member', 'error');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    const sentText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    setMessages(prev => [...prev, {
      _id: tempId,
      senderId: user._id,
      text: sentText,
      createdAt: new Date().toISOString(),
      time: new Date().toLocaleTimeString(),
      delivered: false,
      read: false,
      isTemp: true
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

    socket.emit('private-message', {
      receiverId: selectedChat._id,
      text: sentText,
      image: '',
      audio: ''
    });
  };

  // Audio
  const sendAudioMessage = (audioUrl) => {
    if (!selectedChat) return;

    socket.emit('private-message', {
      receiverId: selectedChat._id,
      text: '',
      image: '',
      audio: audioUrl
    });

    setMessages(prev => [...prev, {
      senderId: user._id,
      text: '',
      audio: audioUrl,
      createdAt: new Date().toISOString(),
      time: new Date().toLocaleTimeString(),
      delivered: false,
      read: false,
      _id: Date.now()
    }]);

    setFriends(prev => {
      const updated = prev.map(f =>
        f._id === selectedChat._id ? { ...f, lastMessage: '🎤 Voice note', time: 'Just now' } : f
      );
      const idx = updated.findIndex(f => f._id === selectedChat._id);
      if (idx > -1) {
        const [chat] = updated.splice(idx, 1);
        return [chat, ...updated];
      }
      return updated;
    });
  };

  const uploadVoiceNote = async (blob) => {
    try {
      const formData = new FormData();
      formData.append('file', blob, 'voice-note.webm');
      formData.append('upload_preset', CLOUDINARY_PRESET);
      formData.append('resource_type', 'video');
      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`,
        formData
      );
      sendAudioMessage(res.data.secure_url);
    } catch {
      showNotification('Voice note upload failed', 'error');
    }
  };

  // ============================================================
  // VOICE RECORDING FUNCTIONS
  // ============================================================
  const startRecording = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isRecording) return;

    if (!selectedChat) {
      showNotification('Select a chat first', 'error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      recordStreamRef.current = stream;
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        clearInterval(recordTimerRef.current);
        setIsRecording(false);
        setRecordSeconds(0);
        
        if (blob.size > 500) {
          uploadVoiceNote(blob);
        } else {
          showNotification('Recording too short', 'info');
        }
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordSeconds(prev => {
          if (prev + 1 >= MAX_RECORD_SECONDS) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error('Microphone error:', err);
      showNotification('Microphone access denied or unavailable', 'error');
    }
  };

  const stopRecording = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordSeconds(0);
    clearInterval(recordTimerRef.current);
  };

  const formatRecordTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const sendImageMessage = (imageUrl) => {
    if (!selectedChat) return;
    socket.emit('private-message', {
      receiverId: selectedChat._id,
      text: '',
      image: imageUrl,
      audio: ''
    });

    setMessages(prev => [...prev, {
      senderId: user._id,
      text: '',
      image: imageUrl,
      createdAt: new Date().toISOString(),
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
    const tempId = `temp-${Date.now()}`;

    setGroupMessages(prev => [...prev, {
      _id: tempId,
      senderId: user._id,
      senderName: 'You',
      text: sentText,
      createdAt: new Date().toISOString(),
      time: new Date().toLocaleTimeString(),
      isTemp: true
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

    socket.emit('group-message', {
      groupId: selectedGroup._id,
      text: sentText
    });
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
      setGroupMessages(prev =>
        forEveryone
          ? prev.map(m => m._id === messageId ? { ...m, text: 'This message was deleted', deletedForEveryone: true } : m)
          : prev.filter(m => m._id !== messageId)
      );
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to delete message', 'error');
    }
  };

  const goBackToChats = () => {
    setIsMobileChatOpen(false);
    setSelectedChat(null);
    setSelectedGroup(null);
    setTypingUser(null);
  };

  // Socket connection
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

  // Socket events
  useEffect(() => {
    const handleNewMessage = (message) => {
      if (message.sender === user._id) return;

      if (selectedChat && message.sender === selectedChat._id) {
        setMessages(prev => [...prev, {
          _id: message._id,
          senderId: message.sender,
          text: message.text,
          image: message.image,
          audio: message.audio,
          createdAt: message.createdAt || new Date().toISOString(),
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
        // Update total unread count for home icon dot
        setTotalUnread(prev => prev + 1);
      }

      setFriends(prev => {
        const updated = prev.map(f =>
          f._id === message.sender
            ? { ...f, lastMessage: message.audio ? '🎤 Voice note' : (message.image ? '📷 Photo' : (message.text || 'Media')), time: 'Just now' }
            : f
        );
        const idx = updated.findIndex(f => f._id === message.sender);
        if (idx === -1) return updated;
        const [chat] = updated.splice(idx, 1);
        return [chat, ...updated];
      });
    };

    const handleNewGroupMessage = (message) => {
      if (message.sender === user._id) {
        setGroupMessages(prev => {
          const withoutTemp = prev.filter(m => !m.isTemp);
          return [...withoutTemp, {
            _id: message._id,
            senderId: message.sender,
            senderName: message.senderName || 'You',
            text: message.text,
            image: message.image,
            type: message.type || 'text',
            createdAt: message.createdAt || new Date().toISOString(),
            time: new Date(message.createdAt || Date.now()).toLocaleTimeString()
          }];
        });
        return;
      }

      if (selectedGroup && message.groupId === selectedGroup._id) {
        setGroupMessages(prev => [...prev, {
          _id: message._id,
          senderId: message.sender,
          senderName: message.senderName || 'Member',
          text: message.text,
          image: message.image,
          type: message.type || 'text',
          createdAt: message.createdAt || new Date().toISOString(),
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
      setMessages(prev => {
        const withoutTemp = prev.filter(m => !m.isTemp);
        return [...withoutTemp, {
          _id: message._id,
          senderId: message.sender || user._id,
          text: message.text,
          image: message.image,
          audio: message.audio,
          createdAt: message.createdAt || new Date().toISOString(),
          time: new Date(message.createdAt || Date.now()).toLocaleTimeString(),
          delivered: message.delivered || false,
          read: message.read || false
        }];
      });
    };

    const handleMessageEdited = (data) => {
      const { _id, text, edited } = data;
      setMessages(prev => prev.map(m => (m._id === _id ? { ...m, text, edited } : m)));
      setGroupMessages(prev => prev.map(m => (m._id === _id ? { ...m, text, edited } : m)));
    };

    socket.on('new-message', handleNewMessage);
    socket.on('new-group-message', handleNewGroupMessage);
    socket.on('typing', handleTypingEvent);
    socket.on('messages-read', handleMessagesRead);
    socket.on('message-sent', handleMessageSent);
    socket.on('message-edited', handleMessageEdited);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('new-group-message', handleNewGroupMessage);
      socket.off('typing', handleTypingEvent);
      socket.off('messages-read', handleMessagesRead);
      socket.off('message-sent', handleMessageSent);
      socket.off('message-edited', handleMessageEdited);
    };
  }, [selectedChat, selectedGroup]);

  const filteredFriends = friends.filter(f =>
    f.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate total unread messages
  useEffect(() => {
    const total = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
    setTotalUnread(total);
  }, [unreadCounts]);

  if (loading) {
    return <div className="hm-loading"><div className="hm-spinner"></div></div>;
  }

  return (
    <>
      {notification.show && (
        <div className={`hm-notification hm-notification-${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="hm-page">
        {/* LEFT PANEL */}
        <div className={`hm-sidebar ${isMobileChatOpen ? 'hm-sidebar-hidden' : ''}`}>
          <div className="hm-sidebar-top">
            <div className="hm-brand">
              <span>ConnectHub</span>
              {/* Home icon with notification dot */}
              <div className="hm-brand-icons">
                <button 
                  className="hm-profile-btn" 
                  onClick={openProfileModal}
                  title="Edit Profile"
                >
                  <span className="hm-profile-icon">👤</span>
                </button>
                {totalUnread > 0 && (
                  <span className="hm-home-dot">{totalUnread > 99 ? '99+' : totalUnread}</span>
                )}
              </div>
            </div>
          </div>

          <div className="hm-search">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="hm-nav">
            <button className={`hm-nav-item ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => handleTabSwitch('inbox')}>
              <span className="hm-nav-icon">💬</span>
              <span>Inbox</span>
              {totalUnread > 0 && (
                <span className="hm-nav-badge">{totalUnread > 99 ? '99+' : totalUnread}</span>
              )}
            </button>
            <button className={`hm-nav-item ${activeTab === 'discover' ? 'active' : ''}`} onClick={() => handleTabSwitch('discover')}>
              <span className="hm-nav-icon">🔍</span>
              <span>Discover</span>
            </button>
            <button className={`hm-nav-item ${activeTab === 'invites' ? 'active' : ''}`} onClick={() => handleTabSwitch('invites')}>
              <span className="hm-nav-icon">✉️</span>
              <span>Invites</span>
              {showInviteDot && (
                <span className="hm-nav-dot"></span>
              )}
              {pendingRequests.length > 0 && (
                <span className="hm-nav-badge">{pendingRequests.length}</span>
              )}
            </button>
            <button className={`hm-nav-item ${activeTab === 'spaces' ? 'active' : ''}`} onClick={() => handleTabSwitch('spaces')}>
              <span className="hm-nav-icon">⬡</span>
              <span>Spaces</span>
            </button>
          </div>

          <div className="hm-list">
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
                    <button className="hm-action-btn" onClick={(e) => { e.stopPropagation(); sendFriendRequest(u._id); }}>
                      Connect
                    </button>
                  </div>
                ))
              )
            )}

            {activeTab === 'invites' && (
              pendingRequests.length === 0 ? (
                <div className="hm-empty">
                  <div className="hm-empty-icon">✉️</div>
                  <h3>No pending invites</h3>
                  <p>When someone wants to connect, it will show here</p>
                </div>
              ) : (
                pendingRequests.map(req => (
                  <div key={req._id} className="hm-item hm-invite-item">
                    <Avatar person={req.sender} />
                    <div className="hm-item-body">
                      <div className="hm-item-name">{req.sender?.name}</div>
                      <div className="hm-item-preview">{req.sender?.email}</div>
                    </div>
                    <div className="hm-invite-actions">
                      <button 
                        className="hm-accept-btn" 
                        onClick={() => acceptRequest(req._id)}
                        title="Accept"
                      >
                        ✓
                      </button>
                      <button 
                        className="hm-decline-btn" 
                        onClick={() => rejectRequest(req._id)}
                        title="Decline"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )
            )}

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
                        <div className="hm-item-preview">{group.members?.length || 0} members</div>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>

        {/* CHAT PANE */}
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
                <button className="hm-more" onClick={() => setShowGroupInfo(true)} title="Space Info">
                  <i className="bx bx-info-circle"></i>
                </button>
              </div>

              <div className="hm-messages">
                {Object.entries(groupMessagesByDate(groupMessages)).map(([dateKey, msgs]) => (
                  <div key={dateKey}>
                    <div className="hm-date-divider">
                      <span>{getDateLabel(dateKey)}</span>
                    </div>
                    {msgs.map((msg) => (
                      <div key={msg._id || msg.time} className={`hm-msg ${msg.senderId === user._id ? 'sent' : 'received'}`}>
                        <div className="hm-bubble">
                          {msg.type === 'system' ? (
                            <div className="hm-system-msg">{msg.text}</div>
                          ) : (
                            <>
                              {msg.senderId !== user._id && <div className="hm-sender">{msg.senderName}</div>}

                              {editingMessageId === msg._id ? (
                                <div className="hm-edit-box">
                                  <input
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && saveEditMessage()}
                                    autoFocus
                                  />
                                  <div className="hm-edit-actions">
                                    <button onClick={saveEditMessage}>Save</button>
                                    <button onClick={cancelEdit}>Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {msg.image && <img src={msg.image} alt="shared" className="hm-msg-image" />}
                                  {msg.audio && ( <audio controls src={msg.audio} className='hm-msg-audio' />)}
                                  {msg.text}
                                  {msg.edited && <small className="hm-edited">edited</small>}
                                </>
                              )}

                              <span className="hm-time">{formatMessageTime(msg.createdAt || msg.time)}</span>

                              {msg.senderId === user._id && (
                                <>
                                  <button
                                    className="hm-msg-menu-btn"
                                    onClick={() => setOpenMsgMenu(openMsgMenu === msg._id ? null : msg._id)}
                                  >
                                    ⋮
                                  </button>
                                  {openMsgMenu === msg._id && (
                                    <div className="hm-msg-menu">
                                      <button onClick={() => startEditMessage(msg)}>Edit</button>
                                      <button onClick={() => { deleteMessage(msg._id, false); setOpenMsgMenu(null); }}>
                                        Delete for me
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
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
                  onKeyPress={(e) => { if (enterToSend && e.key === 'Enter') sendGroupMessage(); }}
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
                <button className="hm-more" onClick={() => removeFriend(selectedChat._id)} title="Remove connection">
                  <i className="bx bx-user-x"></i>
                </button>
              </div>

              <div className="hm-messages">
                {Object.entries(groupMessagesByDate(messages)).map(([dateKey, msgs]) => (
                  <div key={dateKey}>
                    <div className="hm-date-divider">
                      <span>{getDateLabel(dateKey)}</span>
                    </div>
                    {msgs.map((msg) => (
                      <div key={msg._id || msg.time} className={`hm-msg ${msg.senderId === user._id ? 'sent' : 'received'}`}>
                        <div className="hm-bubble">
                          {editingMessageId === msg._id ? (
                            <div className="hm-edit-box">
                              <input
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && saveEditMessage()}
                                autoFocus
                              />
                              <div className="hm-edit-actions">
                                <button onClick={saveEditMessage}>Save</button>
                                <button onClick={cancelEdit}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {msg.image && <img src={msg.image} alt="shared" className="hm-msg-image" />}
                              {msg.audio && <audio controls src={msg.audio} className="hm-msg-audio" />}
                              {msg.text}
                              {msg.edited && <small className="hm-edited">edited</small>}
                            </>
                          )}

                          <span className="hm-time">
                            <MessageTicks
                              senderId={msg.senderId}
                              userId={user._id}
                              delivered={msg.delivered}
                              read={msg.read}
                            />
                            {formatMessageTime(msg.createdAt || msg.time)}
                          </span>

                          {msg.senderId === user._id && !msg.deletedForEveryone && (
                            <>
                              <button
                                className="hm-msg-menu-btn"
                                onClick={() => setOpenMsgMenu(openMsgMenu === msg._id ? null : msg._id)}
                              >
                                ⋮
                              </button>
                              {openMsgMenu === msg._id && (
                                <div className="hm-msg-menu">
                                  <button onClick={() => startEditMessage(msg)}>Edit</button>
                                  <button onClick={() => { deleteMessage(msg._id, false); setOpenMsgMenu(null); }}>
                                    Delete for me
                                  </button>
                                  <button onClick={() => { deleteMessage(msg._id, true); setOpenMsgMenu(null); }}>
                                    Delete for everyone
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="hm-composer">
                <button
                  className="hm-attach"
                  onClick={() => chatFileInputRef.current.click()}
                  disabled={uploadingImage || isRecording}
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

                {isRecording ? (
                  <div className="hm-recording-bar">
                    <span className="hm-recording-dot" />
                    <span>Recording... {formatRecordTime(recordSeconds)}</span>
                    <button className="hm-cancel-record" onClick={cancelRecording}>Cancel</button>
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Write a message..."
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyPress={(e) => { if (enterToSend && e.key === 'Enter') sendMessage(); }}
                  />
                )}

                <button
                  className={`hm-mic-btn ${isRecording ? 'recording' : ''}`}
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={(e) => { if (isRecording) stopRecording(e); }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startRecording(e);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    stopRecording(e);
                  }}
                  onTouchCancel={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    cancelRecording(e);
                  }}
                  title="Hold to record"
                  style={{
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitTouchCallout: 'none',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                >
                  🎤
                </button>

                <button className="hm-send" onClick={sendMessage} disabled={isRecording}>
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

      {/* ============================================================ */}
      {/* PROFILE EDIT MODAL */}
      {/* ============================================================ */}
      {showProfileModal && (
        <div className="hm-modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="hm-modal hm-profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hm-modal-header">
              <h3>Edit Profile</h3>
              <button onClick={() => setShowProfileModal(false)}>✕</button>
            </div>

            <div className="hm-profile-avatar-section">
              <div className="hm-profile-avatar-wrapper">
                {profileAvatar ? (
                  <img src={profileAvatar} alt="Profile" className="hm-profile-avatar-img" />
                ) : (
                  <div className="hm-profile-avatar-placeholder">
                    {profileName?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <button 
                  className="hm-profile-avatar-upload"
                  onClick={() => avatarInputRef.current.click()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? '⏳' : '📷'}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={uploadProfileAvatar}
                />
              </div>
            </div>

            <div className="hm-profile-form">
              <label>Display Name</label>
              <input
                type="text"
                className="hm-modal-input"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <div className="hm-modal-footer">
              <button className="hm-cancel-btn" onClick={() => setShowProfileModal(false)}>
                Cancel
              </button>
              <button className="hm-create-btn" onClick={updateProfile}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE SPACE MODAL */}
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
                    {selectedMembers.includes(friend._id) && <span className="hm-check">✓</span>}
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

      {/* GROUP INFO MODAL */}
      {showGroupInfo && selectedGroup && (
        <div className="hm-modal-overlay" onClick={() => setShowGroupInfo(false)}>
          <div className="hm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hm-modal-header">
              <h3>Space Info</h3>
              <button onClick={() => setShowGroupInfo(false)}>✕</button>
            </div>

            <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
              <Avatar person={selectedGroup} isGroup className="hm-avatar-group" />
              <h2 style={{ margin: '12px 0 4px' }}>{selectedGroup.name}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                {selectedGroup.members?.length || 0} members
              </p>

              {isGroupAdmin(selectedGroup) && (
                <input
                  className="hm-modal-input"
                  style={{ marginTop: '12px' }}
                  defaultValue={selectedGroup.name}
                  onBlur={(e) => updateGroupName(e.target.value)}
                  placeholder="Space name"
                />
              )}
            </div>

            <p className="hm-modal-label">Members</p>
            <div className="hm-modal-list">
              {selectedGroup.members?.map((member) => {
                const memberId = member._id || member;
                const memberName = member.name || 'Member';
                const isAdmin = memberId === (selectedGroup.admin?._id || selectedGroup.admin);

                return (
                  <div key={memberId} className="hm-item">
                    <Avatar person={member} />
                    <div className="hm-item-body">
                      <div className="hm-item-name">
                        {memberName}
                        {isAdmin && <span className="hm-admin-badge">Admin</span>}
                      </div>
                    </div>

                    {isGroupAdmin(selectedGroup) && memberId !== user._id && (
                      <button
                        className="hm-remove-member"
                        onClick={() => removeMemberFromGroup(memberId)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {isGroupAdmin(selectedGroup) && (
              <div className="hm-modal-footer">
                <button
                  className="hm-create-btn"
                  onClick={() => {
                    setShowGroupInfo(false);
                    setShowAddMembers(true);
                  }}
                >
                  + Add Members
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD MEMBERS MODAL */}
      {showAddMembers && selectedGroup && (
        <div className="hm-modal-overlay" onClick={() => setShowAddMembers(false)}>
          <div className="hm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hm-modal-header">
              <h3>Add Members</h3>
              <button onClick={() => setShowAddMembers(false)}>✕</button>
            </div>

            <div className="hm-modal-list">
              {friends
                .filter(f => !selectedGroup.members?.some(m => (m._id || m) === f._id))
                .map(friend => (
                  <div
                    key={friend._id}
                    className={`hm-item ${selectedToAdd.includes(friend._id) ? 'selected' : ''}`}
                    onClick={() => toggleMemberToAdd(friend._id)}
                  >
                    <Avatar person={friend} />
                    <div className="hm-item-body">
                      <div className="hm-item-name">{friend.name}</div>
                    </div>
                    {selectedToAdd.includes(friend._id) && <span className="hm-check">✓</span>}
                  </div>
                ))}
            </div>

            <div className="hm-modal-footer">
              <button
                className="hm-create-btn"
                onClick={addMembersToGroup}
                disabled={selectedToAdd.length === 0}
              >
                Add {selectedToAdd.length > 0 ? `(${selectedToAdd.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Home;