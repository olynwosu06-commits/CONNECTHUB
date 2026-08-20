import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Loading.css';

function Loading() {
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => navigate('/home'), 600);
          return 100;
        }
        const increment = Math.floor(Math.random() * 6) + 3;
        return Math.min(prev + increment, 100);
      });
    }, 280);

    return () => clearInterval(interval);
  }, [navigate]);

  const getStatus = () => {
    if (progress < 25) return 'Connecting securely...';
    if (progress < 50) return 'Loading your conversations...';
    if (progress < 75) return 'Syncing contacts...';
    if (progress < 100) return 'Almost ready...';
    return 'Welcome back!';
  };

  return (
    <div className="loading-screen">
      <div className="loading-card">
        {/* Brand */}
        <div className="loading-brand">
          {/* <img
            src="https://res.cloudinary.com/daaiil1ah/image/upload/v1784995479/free-whatsapp-logo-icon-4456-thumb_cvjd7y.png"
            alt="ConnectHub"
          /> */}
          <h1>ConnectHub</h1>
        </div>

        {/* Message */}
        <div className="loading-message">
          <h2>Preparing your workspace</h2>
          <p>We’re getting everything ready for you.</p>
        </div>

        {/* Progress */}
        <div className="progress-wrapper">
          <div className="progress-header">
            <span>{getStatus()}</span>
            <span className="percent">{progress}%</span>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Subtle dots */}
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
}

export default Loading;