import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import '../components/Navbar.css';

function Navbar({ hideOnChat = false }) {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const token = localStorage.getItem('token');
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const toggleDropdown = () => {
    setDropdownOpen((prev) => !prev);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setDropdownOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const fetchUnreadCount = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/notifications/unread-count`, authHeaders);
      setUnreadCount(res.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchUnreadCount();
  }, [location.pathname]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest('.dropdown-container')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [dropdownOpen]);

  if (hideOnChat) return null;

  const isActive = (path) => location.pathname === path;

  return (
    <div className="side-bar">
      <ul className="menu-top">
        <li
          className={isActive('/home') ? 'active' : ''}
          onClick={() => handleNavigate('/home')}
          title="Inbox"
        >
          <i className="bx bx-message-square-dots"></i>
        </li>

        <li
          onClick={() => handleNavigate('status')}
          title="Status"
        >
          <i className="bx bx-search"></i>
        </li>

        <li
          className={isActive('/notifications') ? 'active' : ''}
          onClick={() => handleNavigate('/notifications')}
          title="Notifications"
          style={{ position: 'relative' }}
        >
          <i className="bx bx-bell"></i>
          {unreadCount > 0 && (
            <span className="nav-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </li>
      </ul>

      <ul className="menu-bottom">
        <li onClick={toggleTheme} title="Toggle Theme">
          <i className={theme === 'light' ? 'bx bx-moon' : 'bx bx-sun'}></i>
        </li>

        <li
          className="dropdown-container"
          onClick={toggleDropdown}
          title="More"
        >
          <i
            className={`bx bx-dots-horizontal-rounded ${
              dropdownOpen ? 'active' : ''
            }`}
          ></i>

          {dropdownOpen && (
            <div
              className="dropdown-menu"
              onClick={(e) => e.stopPropagation()}
            >
              <ul>
                <li onClick={() => handleNavigate('/home')}>
                  <i className="bx bx-message-square-dots"></i>
                  <span>Inbox</span>
                </li>
                <li onClick={() => handleNavigate('status')}>
                  <i className="bx bx-search"></i>
                  <span>Status</span>
                </li>
                <li onClick={() => handleNavigate('/settings')}>
                  <i className="bx bx-cog"></i>
                  <span>Settings</span>
                </li>
                <li onClick={handleLogout} className="logout-item">
                  <i className="bx bx-log-out"></i>
                  <span>Logout</span>
                </li>
                              <div className="label-row">
                <label>Password</label>
                <Link to="/forgot-password">Forgot Password?</Link>  {/* ← Changed from <a> to <Link> */}
              </div>
              </ul>
            </div>
          )}
        </li>
      </ul>
    </div>
  );
}

export default Navbar;