import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Settings.css';

function Settings() {
    const navigate = useNavigate();

    const user = JSON.parse(
        localStorage.getItem('user') || '{}'
    );

    const [theme, setTheme] = useState(
        localStorage.getItem('theme') || 'dark'
    );

    const [notifications, setNotifications] = useState(
        localStorage.getItem('notifications') !== 'false'
    );

    const [messageSounds, setMessageSounds] = useState(
        localStorage.getItem('messageSounds') !== 'false'
    );

    const [readReceipts, setReadReceipts] = useState(
        localStorage.getItem('readReceipts') !== 'false'
    );

    const [onlineStatus, setOnlineStatus] = useState(
        localStorage.getItem('onlineStatus') !== 'false'
    );

    const [typingStatus, setTypingStatus] = useState(
        localStorage.getItem('typingStatus') !== 'false'
    );

    const [enterToSend, setEnterToSend] = useState(
        localStorage.getItem('enterToSend') !== 'false'
    );

    const [mediaAutoDownload, setMediaAutoDownload] = useState(
        localStorage.getItem('mediaAutoDownload') !== 'false'
    );

    const [language, setLanguage] = useState(
        localStorage.getItem('language') || 'English'
    );

    const [activeSection, setActiveSection] = useState('general');

    const [showLanguages, setShowLanguages] = useState(false);

    /* =========================================
       THEME
    ========================================= */

    const toggleTheme = () => {
        const newTheme =
            theme === 'light'
                ? 'dark'
                : 'light';

        setTheme(newTheme);

        localStorage.setItem(
            'theme',
            newTheme
        );

        document.documentElement.setAttribute(
            'data-theme',
            newTheme
        );
    };

    /* =========================================
       SETTING HELPER
    ========================================= */

    const toggleSetting = (
        name,
        value,
        setter
    ) => {
        const newValue = !value;

        setter(newValue);

        localStorage.setItem(
            name,
            String(newValue)
        );
    };

    /* =========================================
       LANGUAGE
    ========================================= */

    const changeLanguage = (value) => {
        setLanguage(value);

        localStorage.setItem(
            'language',
            value
        );

        setShowLanguages(false);
    };

    /* =========================================
       LOGOUT
    ========================================= */

    const handleLogout = () => {
        const confirmed = window.confirm(
            'Are you sure you want to logout?'
        );

        if (!confirmed) return;

        localStorage.removeItem('token');
        localStorage.removeItem('user');

        navigate('/login');
    };

    /* =========================================
       RESET SETTINGS
    ========================================= */

    const resetSettings = () => {
        const confirmed = window.confirm(
            'Reset all ConnectHub settings to default?'
        );

        if (!confirmed) return;

        const defaults = {
            notifications: true,
            messageSounds: true,
            readReceipts: true,
            onlineStatus: true,
            typingStatus: true,
            enterToSend: true,
            mediaAutoDownload: true,
            language: 'English',
        };

        Object.entries(defaults).forEach(
            ([key, value]) => {
                localStorage.setItem(
                    key,
                    String(value)
                );
            }
        );

        setNotifications(true);
        setMessageSounds(true);
        setReadReceipts(true);
        setOnlineStatus(true);
        setTypingStatus(true);
        setEnterToSend(true);
        setMediaAutoDownload(true);
        setLanguage('English');
    };

    /* =========================================
       THEME INITIALIZATION
    ========================================= */

    useEffect(() => {
        document.documentElement.setAttribute(
            'data-theme',
            theme
        );
    }, [theme]);

    /* =========================================
       USER DATA
    ========================================= */

    const userName =
        user.name || 'ConnectHub User';

    const userEmail =
        user.email || 'No email available';

    const userInitial =
        userName
            .charAt(0)
            .toUpperCase();

    return (
        <div className="settings-page">

            {/* =================================
                TOP HEADER
            ================================= */}

            <header className="settings-header">

                <div className="settings-header-left">

                    <button
                        className="settings-back"
                        onClick={() =>
                            navigate(-1)
                        }
                        aria-label="Go back"
                    >
                        <i className="bx bx-arrow-back"></i>
                    </button>

                    <div>
                        <h1>Settings</h1>

                        <p>
                            Customize your ConnectHub experience
                        </p>
                    </div>

                </div>

                <div className="settings-header-badge">

                    <i className="bx bx-cog"></i>

                    <span>
                        Preferences
                    </span>

                </div>

            </header>


            {/* =================================
                MAIN SETTINGS LAYOUT
            ================================= */}

            <div className="settings-layout">

                {/* =================================
                    SIDEBAR
                ================================= */}

                <aside className="settings-sidebar">

                    <button
                        className={
                            activeSection === 'general'
                                ? 'settings-nav active'
                                : 'settings-nav'
                        }
                        onClick={() =>
                            setActiveSection(
                                'general'
                            )
                        }
                    >
                        <i className="bx bx-slider-alt"></i>
                        <span>General</span>
                    </button>

                    <button
                        className={
                            activeSection === 'appearance'
                                ? 'settings-nav active'
                                : 'settings-nav'
                        }
                        onClick={() =>
                            setActiveSection(
                                'appearance'
                            )
                        }
                    >
                        <i className="bx bx-palette"></i>
                        <span>Appearance</span>
                    </button>

                    <button
                        className={
                            activeSection === 'notifications'
                                ? 'settings-nav active'
                                : 'settings-nav'
                        }
                        onClick={() =>
                            setActiveSection(
                                'notifications'
                            )
                        }
                    >
                        <i className="bx bx-bell"></i>
                        <span>Notifications</span>
                    </button>

                    <button
                        className={
                            activeSection === 'privacy'
                                ? 'settings-nav active'
                                : 'settings-nav'
                        }
                        onClick={() =>
                            setActiveSection(
                                'privacy'
                            )
                        }
                    >
                        <i className="bx bx-shield"></i>
                        <span>Privacy</span>
                    </button>

                    <button
                        className={
                            activeSection === 'chat'
                                ? 'settings-nav active'
                                : 'settings-nav'
                        }
                        onClick={() =>
                            setActiveSection(
                                'chat'
                            )
                        }
                    >
                        <i className="bx bx-message-rounded"></i>
                        <span>Chats</span>
                    </button>

                    <button
                        className={
                            activeSection === 'account'
                                ? 'settings-nav active'
                                : 'settings-nav'
                        }
                        onClick={() =>
                            setActiveSection(
                                'account'
                            )
                        }
                    >
                        <i className="bx bx-user"></i>
                        <span>Account</span>
                    </button>

                </aside>


                {/* =================================
                    CONTENT
                ================================= */}

                <main className="settings-content">


                    {/* =================================
                        PROFILE CARD
                    ================================= */}

                    <section className="settings-profile-card">

                        <div className="settings-profile-main">

                            <div className="settings-avatar">

                                {user.profilePicture ? (

                                    <img
                                        src={
                                            user.profilePicture
                                        }
                                        alt={userName}
                                    />

                                ) : (

                                    <span>
                                        {userInitial}
                                    </span>

                                )}

                            </div>

                            <div className="settings-profile-info">

                                <div className="profile-name-row">

                                    <h2>
                                        {userName}
                                    </h2>

                                    <span className="profile-online">
                                        <span></span>
                                        Active
                                    </span>

                                </div>

                                <p>
                                    {userEmail}
                                </p>

                                <small>
                                    ConnectHub member
                                </small>

                            </div>

                        </div>

                        <button
                            className="edit-profile-button"
                            onClick={() =>
                                navigate('/profile')
                            }
                        >
                            <i className="bx bx-edit-alt"></i>
                            Edit Profile
                        </button>

                    </section>


                    {/* =================================
                        GENERAL
                    ================================= */}

                    {activeSection === 'general' && (

                        <>

                            <div className="settings-title-block">

                                <span className="title-icon">
                                    <i className="bx bx-slider-alt"></i>
                                </span>

                                <div>
                                    <h2>
                                        General
                                    </h2>

                                    <p>
                                        Manage your basic ConnectHub preferences.
                                    </p>
                                </div>

                            </div>


                            <section className="settings-card">

                                {/* Language */}

                                <div
                                    className="setting-row clickable"
                                    onClick={() =>
                                        setShowLanguages(
                                            !showLanguages
                                        )
                                    }
                                >

                                    <div className="setting-row-left">

                                        <div className="setting-icon blue">
                                            <i className="bx bx-globe"></i>
                                        </div>

                                        <div>
                                            <h3>
                                                Language
                                            </h3>

                                            <p>
                                                Choose the language used throughout ConnectHub.
                                            </p>
                                        </div>

                                    </div>

                                    <div className="setting-row-right">

                                        <span>
                                            {language}
                                        </span>

                                        <i
                                            className={
                                                showLanguages
                                                    ? 'bx bx-chevron-up'
                                                    : 'bx bx-chevron-down'
                                            }
                                        ></i>

                                    </div>

                                </div>


                                {showLanguages && (

                                    <div className="language-dropdown">

                                        {[
                                            'English',
                                            'French',
                                            'Spanish',
                                            'Portuguese'
                                        ].map((item) => (

                                            <button
                                                key={item}
                                                className={
                                                    language === item
                                                        ? 'language-choice selected'
                                                        : 'language-choice'
                                                }
                                                onClick={() =>
                                                    changeLanguage(
                                                        item
                                                    )
                                                }
                                            >

                                                <span>
                                                    {item}
                                                </span>

                                                {language === item && (
                                                    <i className="bx bx-check"></i>
                                                )}

                                            </button>

                                        ))}

                                    </div>

                                )}


                                {/* Theme */}

                                <div
                                    className="setting-row clickable"
                                    onClick={toggleTheme}
                                >

                                    <div className="setting-row-left">

                                        <div className="setting-icon purple">
                                            <i className="bx bx-palette"></i>
                                        </div>

                                        <div>
                                            <h3>
                                                Appearance
                                            </h3>

                                            <p>
                                                Switch between light and dark mode.
                                            </p>
                                        </div>

                                    </div>

                                    <div className="setting-row-right">

                                        <span>
                                            {theme === 'dark'
                                                ? '🌙 Dark'
                                                : '☀️ Light'}
                                        </span>

                                        <i className="bx bx-chevron-right"></i>

                                    </div>

                                </div>


                                {/* About */}

                                <div className="setting-row">

                                    <div className="setting-row-left">

                                        <div className="setting-icon cyan">
                                            <i className="bx bx-info-circle"></i>
                                        </div>

                                        <div>
                                            <h3>
                                                About ConnectHub
                                            </h3>

                                            <p>
                                                Fast, secure and real-time communication.
                                            </p>
                                        </div>

                                    </div>

                                    <div className="setting-row-right">

                                        <span>
                                            v1.0.0
                                        </span>

                                    </div>

                                </div>

                            </section>

                        </>
                    )}


                    {/* =================================
                        APPEARANCE
                    ================================= */}

                    {activeSection === 'appearance' && (

                        <>

                            <div className="settings-title-block">

                                <span className="title-icon">
                                    <i className="bx bx-palette"></i>
                                </span>

                                <div>
                                    <h2>
                                        Appearance
                                    </h2>

                                    <p>
                                        Make ConnectHub look the way you like.
                                    </p>
                                </div>

                            </div>


                            <section className="theme-options">

                                <button
                                    className={
                                        theme === 'light'
                                            ? 'theme-card selected'
                                            : 'theme-card'
                                    }
                                    onClick={() => {

                                        setTheme('light');

                                        localStorage.setItem(
                                            'theme',
                                            'light'
                                        );

                                        document.documentElement.setAttribute(
                                            'data-theme',
                                            'light'
                                        );

                                    }}
                                >

                                    <div className="theme-preview light-preview">

                                        <div></div>
                                        <div></div>
                                        <div></div>

                                    </div>

                                    <div className="theme-card-info">

                                        <h3>
                                            Light
                                        </h3>

                                        <p>
                                            Bright and clean
                                        </p>

                                    </div>

                                    {theme === 'light' && (
                                        <i className="bx bx-check-circle"></i>
                                    )}

                                </button>


                                <button
                                    className={
                                        theme === 'dark'
                                            ? 'theme-card selected'
                                            : 'theme-card'
                                    }
                                    onClick={() => {

                                        setTheme('dark');

                                        localStorage.setItem(
                                            'theme',
                                            'dark'
                                        );

                                        document.documentElement.setAttribute(
                                            'data-theme',
                                            'dark'
                                        );

                                    }}
                                >

                                    <div className="theme-preview dark-preview">

                                        <div></div>
                                        <div></div>
                                        <div></div>

                                    </div>

                                    <div className="theme-card-info">

                                        <h3>
                                            Dark
                                        </h3>

                                        <p>
                                            Easy on the eyes
                                        </p>

                                    </div>

                                    {theme === 'dark' && (
                                        <i className="bx bx-check-circle"></i>
                                    )}

                                </button>

                            </section>

                        </>
                    )}


                    {/* =================================
                        NOTIFICATIONS
                    ================================= */}

                    {activeSection === 'notifications' && (

                        <>

                            <div className="settings-title-block">

                                <span className="title-icon">
                                    <i className="bx bx-bell"></i>
                                </span>

                                <div>
                                    <h2>
                                        Notifications
                                    </h2>

                                    <p>
                                        Control how ConnectHub keeps you informed.
                                    </p>
                                </div>

                            </div>


                            <section className="settings-card">

                                <div className="setting-row">

                                    <div className="setting-row-left">

                                        <div className="setting-icon orange">
                                            <i className="bx bx-bell"></i>
                                        </div>

                                        <div>
                                            <h3>
                                                Notifications
                                            </h3>

                                            <p>
                                                Receive notifications for new messages.
                                            </p>
                                        </div>

                                    </div>

                                    <label className="toggle">

                                        <input
                                            type="checkbox"
                                            checked={
                                                notifications
                                            }
                                            onChange={() =>
                                                toggleSetting(
                                                    'notifications',
                                                    notifications,
                                                    setNotifications
                                                )
                                            }
                                        />

                                        <span></span>

                                    </label>

                                </div>


                                <div className="setting-row">

                                    <div className="setting-row-left">

                                        <div className="setting-icon green">
                                            <i className="bx bx-volume-full"></i>
                                        </div>

                                        <div>
                                            <h3>
                                                Message sounds
                                            </h3>

                                            <p>
                                                Play a sound when a new message arrives.
                                            </p>
                                        </div>

                                    </div>

                                    <label className="toggle">

                                        <input
                                            type="checkbox"
                                            checked={
                                                messageSounds
                                            }
                                            onChange={() =>
                                                toggleSetting(
                                                    'messageSounds',
                                                    messageSounds,
                                                    setMessageSounds
                                                )
                                            }
                                        />

                                        <span></span>

                                    </label>

                                </div>

                            </section>

                        </>
                    )}


                    {/* =================================
                        PRIVACY
                    ================================= */}

                    {activeSection === 'privacy' && (

                        <>

                            <div className="settings-title-block">

                                <span className="title-icon">
                                    <i className="bx bx-shield"></i>
                                </span>

                                <div>
                                    <h2>
                                        Privacy
                                    </h2>

                                    <p>
                                        Choose what other people can see about you.
                                    </p>
                                </div>

                            </div>


                            <section className="settings-card">

                                <div className="setting-row">

                                    <div className="setting-row-left">

                                        <div className="setting-icon cyan">
                                            <i className="bx bx-check-double"></i>
                                        </div>

                                        <div>
                                            <h3>
                                                Read receipts
                                            </h3>

                                            <p>
                                                Let people know when you've read their messages.
                                            </p>
                                        </div>

                                    </div>

                                    <label className="toggle">

                                        <input
                                            type="checkbox"
                                            checked={
                                                readReceipts
                                            }
                                            onChange={() =>
                                                toggleSetting(
                                                    'readReceipts',
                                                    readReceipts,
                                                    setReadReceipts
                                                )
                                            }
                                        />

                                        <span></span>

                                    </label>

                                </div>


                                <div className="setting-row">

                                    <div className="setting-row-left">

                                        <div className="setting-icon blue">
                                            <i className="bx bx-wifi"></i>
                                        </div>

                                        <div>
                                            <h3>
                                                Online status
                                            </h3>

                                            <p>
                                                Allow contacts to see when you're online.
                                            </p>
                                        </div>

                                    </div>

                                    <label className="toggle">

                                        <input
                                            type="checkbox"
                                            checked={
                                                onlineStatus
                                            }
                                            onChange={() =>
                                                toggleSetting(
                                                    'onlineStatus',
                                                    onlineStatus,
                                                    setOnlineStatus
                                                )
                                            }
                                        />

                                        <span></span>

                                    </label>

                                </div>


                                <div className="setting-row">

                                    <div className="setting-row-left">

                                        <div className="setting-icon purple">
                                            <i className="bx bx-dots-horizontal-rounded"></i>
                                        </div>

                                        <div>
                                            <h3>
                                                Typing indicator
                                            </h3>

                                            <p>
                                                Show when you're typing a message.
                                            </p>
                                        </div>

                                    </div>

                                    <label className="toggle">

                                        <input
                                            type="checkbox"
                                            checked={
                                                typingStatus
                                            }
                                            onChange={() =>
                                                toggleSetting(
                                                    'typingStatus',
                                                    typingStatus,
                                                    setTypingStatus
                                                )
                                            }
                                        />

                                        <span></span>

                                    </label>

                                </div>

                            </section>

                        </>
                    )}


                    {/* =================================
                        CHATS
                    ================================= */}

                    {activeSection === 'chat' && (

                        <>

                            <div className="settings-title-block">

                                <span className="title-icon">
                                    <i className="bx bx-message-rounded"></i>
                                </span>

                                <div>
                                    <h2>
                                        Chats
                                    </h2>

                                    <p>
                                        Customize how your conversations work.
                                    </p>
                                </div>

                            </div>


                            <section className="settings-card">

                                <div className="setting-row">

                                    <div className="setting-row-left">

                                        <div className="setting-icon purple">
                                            <i className="bx bx-send"></i>
                                        </div>

                                        <div>
                                            <h3>
                                                Enter to send
                                            </h3>

                                            <p>
                                                Press Enter to send messages instead of creating a new line.
                                            </p>
                                        </div>

                                    </div>

                                    <label className="toggle">

                                        <input
                                            type="checkbox"
                                            checked={
                                                enterToSend
                                            }
                                            onChange={() =>
                                                toggleSetting(
                                                    'enterToSend',
                                                    enterToSend,
                                                    setEnterToSend
                                                )
                                            }
                                        />

                                        <span></span>

                                    </label>

                                </div>


                                <div className="setting-row">

                                    <div className="setting-row-left">

                                        <div className="setting-icon blue">
                                            <i className="bx bx-cloud-download"></i>
                                        </div>

                                        <div>
                                            <h3>
                                                Automatic media download
                                            </h3>

                                            <p>
                                                Automatically download images and other media.
                                            </p>
                                        </div>

                                    </div>

                                    <label className="toggle">

                                        <input
                                            type="checkbox"
                                            checked={
                                                mediaAutoDownload
                                            }
                                            onChange={() =>
                                                toggleSetting(
                                                    'mediaAutoDownload',
                                                    mediaAutoDownload,
                                                    setMediaAutoDownload
                                                )
                                            }
                                        />

                                        <span></span>

                                    </label>

                                </div>

                            </section>

                        </>
                    )}


                    {/* =================================
                        ACCOUNT
                    ================================= */}

                    {activeSection === 'account' && (

                        <>

                            <div className="settings-title-block">

                                <span className="title-icon">
                                    <i className="bx bx-user"></i>
                                </span>

                                <div>
                                    <h2>
                                        Account
                                    </h2>

                                    <p>
                                        Manage your ConnectHub account.
                                    </p>
                                </div>

                            </div>


                            <section className="settings-card">

                                <div
                                    className="setting-row clickable"
                                    onClick={() =>
                                        navigate('/profile')
                                    }
                                >

                                    <div className="setting-row-left">

                                        <div className="setting-icon blue">
                                            <i className="bx bx-user"></i>
                                        </div>

                                        <div>
                                            <h3>
                                                Edit profile
                                            </h3>

                                            <p>
                                                Change your name, photo and profile information.
                                            </p>
                                        </div>

                                    </div>

                                    <i className="bx bx-chevron-right"></i>

                                </div>


                                <div className="setting-row">

                                    <div className="setting-row-left">

                                        <div className="setting-icon green">
                                            <i className="bx bx-shield-quarter"></i>
                                        </div>

                                        <div>
                                            <h3>
                                                Account security
                                            </h3>

                                            <p>
                                                Keep your account and conversations protected.
                                            </p>
                                        </div>

                                    </div>

                                    <span className="security-status">
                                        Protected
                                    </span>

                                </div>


                                <div
                                    className="setting-row clickable"
                                    onClick={resetSettings}
                                >

                                    <div className="setting-row-left">

                                        <div className="setting-icon gray">
                                            <i className="bx bx-reset"></i>
                                        </div>

                                        <div>
                                            <h3>
                                                Reset preferences
                                            </h3>

                                            <p>
                                                Restore all settings to their defaults.
                                            </p>
                                        </div>

                                    </div>

                                    <i className="bx bx-chevron-right"></i>

                                </div>


                                <div
                                    className="setting-row logout-row"
                                    onClick={handleLogout}
                                >

                                    <div className="setting-row-left">

                                        <div className="setting-icon red">
                                            <i className="bx bx-log-out"></i>
                                        </div>

                                        <div>
                                            <h3>
                                                Log out
                                            </h3>

                                            <p>
                                                Sign out from your ConnectHub account.
                                            </p>
                                        </div>

                                    </div>

                                    <i className="bx bx-chevron-right"></i>

                                </div>

                            </section>

                        </>
                    )}


                    {/* =================================
                        FOOTER
                    ================================= */}

                    <footer className="settings-footer">

                        <div className="footer-logo">
                            <i className="bx bx-message-rounded-dots"></i>
                        </div>

                        <h3>
                            ConnectHub
                        </h3>

                        <p>
                            Fast • Secure • Real-time
                        </p>

                        <small>
                            Version 1.0.0
                        </small>

                    </footer>

                </main>

            </div>

        </div>
    );
}

export default Settings;