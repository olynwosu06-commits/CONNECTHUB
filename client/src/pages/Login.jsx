import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // await axios.post('http://localhost:5000/api/auth/login', 
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, 
         {
        email,
        password,
      });

      console.log('✅ Login response:', response.data);

      const { token, user } = response.data;

      if (!token) {
        setError('Login failed: no token received');
        setLoading(false);
        return;
      }

      if (!user || !user._id) {
        setError(
          'Login failed: user data missing — make sure your backend login returns the user object'
        );
        setLoading(false);
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      console.log('✅ Saved to localStorage:', { token, user });

      navigate('/loading');
    } catch (err) {
      console.error('❌ Login error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Login failed');
      setLoading(false);
    }
  };

return (
  <div className="login-page">

    {/* ========= LEFT PANEL ========= */}
    <section className="login-left">

      <div className="left-content">

        <div className="brand">
          <img
            src="https://res.cloudinary.com/daaiil1ah/image/upload/v1784995479/free-whatsapp-logo-icon-4456-thumb_cvjd7y.png"
            alt="ConnectHub Logo"
          />

          <div>
            <h1>ConnectHub</h1>
            <p>Real-time conversations.</p>
          </div>
        </div>

        <div className="hero-text">
          <h3>
            Connect.
            <br />
            Chat.
            <br />
            Stay Close.
          </h3>

          <p>
            A modern messaging platform built for fast, secure and
            real-time communication. Designed to keep everyone connected,
            anywhere in the world.
          </p>
        </div>

        <div className="chat-preview">

          <div className="message received">
            <span className="avatar">😊</span>

            <div className="bubble">
              <h5>Sarah</h5>
              <p>Hey! Are we still meeting today?</p>
              <small>10:30 AM</small>
            </div>
          </div>

          <div className="message sent">

            <div className="bubble">
              <h5>You</h5>
              <p>Absolutely! I'll be there in 10 mins.</p>
              <small>10:31 AM</small>
            </div>

            <span className="avatar">🚀</span>

          </div>

        </div>

        <div className="features">

          <div className="feature-card">
            <span>⚡</span>
            <h4>Fast</h4>
            <p>Instant messaging</p>
          </div>

          <div className="feature-card">
            <span>🔒</span>
            <h4>Secure</h4>
            <p>Private conversations</p>
          </div>

          <div className="feature-card">
            <span>🌍</span>
            <h4>Anywhere</h4>
            <p>Stay connected</p>
          </div>

        </div>

      </div>

    </section>

    {/* ========= RIGHT PANEL ========= */}

    <section className="login-right">

      <div className="login-box">

        <div className="mobile-logo">

          <img
            src="https://res.cloudinary.com/daaiil1ah/image/upload/v1784995479/free-whatsapp-logo-icon-4456-thumb_cvjd7y.png"
            alt="logo"
          />

        </div>

        <div className="welcome-back">

          <h2>Welcome Back 👋</h2>

          <p>
            Login to continue your conversations.
          </p>

        </div>

        <form onSubmit={handleLogin}>

          <div className="input-group">

            <label>Email</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

          </div>

          <div className="input-group">

            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

          </div>

          <div className="login-options">

            <label className="remember">

              <input type="checkbox" />

              <span>Remember me</span>

            </label>

            <a href="#">Forgot password?</a>

          </div>

          {error && (
            <p className="error-msg">{error}</p>
          )}

          <button
            className="btn-login"
            type="submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        <div className="divider">

          <span></span>

          <p>OR</p>

          <span></span>

        </div>

        <button className="btn-google">

          <img
            src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg"
            alt="google"
          />

          Continue with Google

        </button>

        <div className="signup-text">

          Don't have an account?

          <a href="/register"> Sign Up</a>

        </div>

      </div>

    </section>

  </div>
);
}

export default Login;


