import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/Navbar.css';

function Navbar() {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const navigate = useNavigate();

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    const toggleDropdown = () => {
        setDropdownOpen(prev => !prev);
    };

    const handleIconClick = (path) => {
        navigate(path);
        setDropdownOpen(false);
    };

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


    function Navbar({ hideOnChat = false }) {
    // ... rest of your code

    if (hideOnChat) return null;

    return (
        <div className="side-bar">
            {/* Navbar content */}
        </div>
    );
}

    return (
        <div className="side-bar">
            {/* TOP ICONS */}
            <ul className="menu-top">
                <li className="active" onClick={() => navigate('/home')} title="Chats">
                    <i className="bx bx-chat"></i>
                </li>
                <li onClick={() => navigate('/home')} title="Calls">
                    <i className="bx bx-phone"></i>
                </li>
                <li onClick={() => navigate('/status')} title="Status">
                    <i className="bx bx-circle"></i>
                </li>
                <li title="Media">
                    <i className="bx bx-image" />
                </li>
            </ul>

            {/* BOTTOM ICONS */}
            <ul className="menu-bottom">
                {/* <li onClick={toggleTheme} title="Toggle Theme">
                    <i className={theme === 'light' ? 'bx bx-moon' : 'bx bx-sun'}></i>
                </li> */}

                {/* Three-dots + dropdown */}
                <li
                    className="dropdown-container"
                    onClick={toggleDropdown}
                    title="More options"
                >
                    <i className={`bx bx-dots-vertical-rounded ${dropdownOpen ? 'active' : ''}`}></i>

                    {dropdownOpen && (
                        <div
                            className="dropdown-menu"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ul>
                                <li onClick={() => handleIconClick('/home')}>
                                    <i className="bx bx-chat"></i>
                                    <span>Chats</span>
                                </li>
                                <li onClick={() => handleIconClick('/home')}>
                                    <i className="bx bx-phone"></i>
                                    <span>Calls</span>
                                </li>
                                <li onClick={() => handleIconClick('/status')}>
                                    <i className="bx bx-circle"></i>
                                    <span>Status</span>
                                </li>
                                <li onClick={() => handleIconClick('/settings')}>
                                    <i className="bx bx-cog" />
                                    <span>Settings</span>
                                </li>
                            </ul>
                        </div>
                    )}
                </li>

                <li
                    onClick={() => {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        navigate('/login');
                    }}
                    title="Logout"
                >
                    {/* <i className="bx bxs-log-out"></i> */}
                </li>
            </ul>
        </div>
    );
}

export default Navbar;