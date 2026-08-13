import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../components/Navbar.css';

function Navbar({ hideOnChat = false }) {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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

  // Theme sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Close dropdown when clicking outside
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

  // Conditional return AFTER all hooks
  if (hideOnChat) return null;

  const isActive = (path) => location.pathname === path;

  return (
    <div className="side-bar">
      {/* TOP ICONS */}
      <ul className="menu-top">
        <li
          className={isActive('/home') ? 'active' : ''}
          onClick={() => handleNavigate('/home')}
          title="Inbox"
        >
          <i className="bx bx-message-square-dots"></i>
        </li>

        <li
          onClick={() => handleNavigate('/home')}
          title="Discover"
        >
          <i className="bx bx-search"></i>
        </li>

        <li
          onClick={() => handleNavigate('/home')}
          title="Spaces"
        >
          <i className="bx bx-grid-alt"></i>
        </li>
      </ul>

      {/* BOTTOM ICONS */}
      <ul className="menu-bottom">
        {/* Theme Toggle */}
        <li onClick={toggleTheme} title="Toggle Theme">
          <i className={theme === 'light' ? 'bx bx-moon' : 'bx bx-sun'}></i>
        </li>

        {/* More Options */}
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
                <li onClick={() => handleNavigate('/home')}>
                  <i className="bx bx-search"></i>
                  <span>Discover</span>
                </li>
                <li onClick={() => handleNavigate('/home')}>
                  <i className="bx bx-grid-alt"></i>
                  <span>Spaces</span>
                </li>
                <li onClick={() => handleNavigate('/settings')}>
                  <i className="bx bx-cog"></i>
                  <span>Settings</span>
                </li>
                <li onClick={handleLogout} className="logout-item">
                  <i className="bx bx-log-out"></i>
                  <span>Logout</span>
                </li>
              </ul>
            </div>
          )}
        </li>

        {/* Logout */}
        {/* <li onClick={handleLogout} title="Logout">
          <i className="bx bx-log-out"></i>
        </li> */}
      </ul>
    </div>
  );
}

export default Navbar;