import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useNavigate, Link} from 'react-router-dom';
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
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password,
      });

      const { token, user } = response.data;

      if (!token) {
        setError('Login failed: no token received');
        setLoading(false);
        return;
      }

      if (!user || !user._id) {
        setError('Login failed: user data missing');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      navigate('/loading');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* LEFT SIDE */}
      <section className="login-left">
        <div className="left-content">
          <div className="brand">
            {/* <img
              src="https://res.cloudinary.com/daaiil1ah/image/upload/v1784995479/free-whatsapp-logo-icon-4456-thumb_cvjd7y.png"
              alt="ConnectHub"
            /> */}
            <div>
              <h1>ConnectHub</h1>
              <p>Real-time conversations</p>
            </div>
          </div>

          <div className="hero">
            <h2>
              Connect with the<br />
              people that matter.
            </h2>
            <p>
              Fast, secure and reliable messaging designed for the way you
              communicate today.
            </p>
          </div>

          <div className="left-footer">
            <span>Trusted by teams worldwide</span>
          </div>
        </div>
      </section>

      {/* RIGHT SIDE */}
      <section className="login-right">
        <div className="login-card">
          <div className="mobile-brand">
            <img
              src="https://res.cloudinary.com/daaiil1ah/image/upload/v1784995479/free-whatsapp-logo-icon-4456-thumb_cvjd7y.png"
              alt="logo"
            />
            <h3>ConnectHub</h3>
          </div>

          <div className="card-header">
            <h2>Welcome back</h2>
            <p>Sign in to continue to your account</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <div className="label-row">
                <label>Password</label>
                <Link to="/forgot-password">Forgot Password?</Link>  {/* ← Changed from <a> to <Link> */}
              </div>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <div className="error">{error}</div>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="divider">
            <span>or</span>
          </div>

          <button className="btn-google">
            <img
              src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg"
              alt="Google"
            />
            Continue with Google
          </button>

          <p className="signup-link">
            Don't have an account? <a href="/register">Create one</a>
          </p>
        </div>
      </section>
    </div>
  );
}

export default Login;