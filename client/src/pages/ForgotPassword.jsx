import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';
import '../styles/ForgotPassword.css'

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, {
                email
            });
            
            setMessage(response.data.message);
            setEmail('');
            setTimeout(() => navigate('/login'), 5000);
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="forgot-password-container">
            <h1>Reset Password</h1>
            <p>Enter your email to receive a reset link</p>
            
            <form onSubmit={handleSubmit}>
                <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                
                {message && <div className="success-msg">{message}</div>}
                {error && <div className="error-msg">{error}</div>}
                
                <button type="submit" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
            </form>
            
            <a href="/login">Back to Login</a>
        </div>
    );
}

export default ForgotPassword;