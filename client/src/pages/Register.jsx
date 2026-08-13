import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import axios from 'axios';
import '../styles/Login.css'; // We reuse the same clean styles

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!agree) {
      setError('Please agree to the Terms of Service');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API_BASE_URL}/api/auth/register`, {
        name,
        email,
        password,
      });

      setSuccess('Account created successfully! You can now sign in.');
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setAgree(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* LEFT SIDE */}
      <section className="login-left">
        <div className="left-content">
          <div className="brand">
            <img
              src="https://res.cloudinary.com/daaiil1ah/image/upload/v1784995479/free-whatsapp-logo-icon-4456-thumb_cvjd7y.png"
              alt="ConnectHub"
            />
            <div>
              <h1>ConnectHub</h1>
              <p>Real-time conversations</p>
            </div>
          </div>

          <div className="hero">
            <h2>
              Join the community.<br />
              Start connecting.
            </h2>
            <p>
              Create your free account and experience fast, secure messaging
              with the people who matter most.
            </p>
          </div>

          <div className="left-footer">
            <span>Join thousands of users already chatting</span>
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
            <h2>Create account</h2>
            <p>Sign up to get started with ConnectHub</p>
          </div>

          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>Full name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

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
              <label>Password</label>
              <input
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm password</label>
              <input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                />
                <span>
                  I agree to the <a href="#">Terms</a> & <a href="#">Privacy Policy</a>
                </span>
              </label>
            </div>

            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
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
            Sign up with Google
          </button>

          <p className="signup-link">
            Already have an account? <a href="/login">Sign in</a>
          </p>
        </div>
      </section>
    </div>
  );
}

export default Register;