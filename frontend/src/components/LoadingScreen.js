import React, { useState, useEffect } from 'react';
import './LoadingScreen.css';

const LoadingScreen = ({ message }) => {
  const [currentMessage, setCurrentMessage] = useState(0);
  
  const loadingMessages = [
    "🔥 Firing up the engines...",
    "✨ Sprinkling some magic...",
    "🎨 Painting your experience...",
    "🚀 Almost there...",
    "⚡ Loading awesome stuff...",
    "🎯 Getting everything ready...",
    "🌟 Making things perfect...",
    "🎭 Setting the stage...",
    "🎪 Preparing the show...",
    "🍳 Cooking something great..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [loadingMessages.length]);

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="spinner-container">
          <div className="spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-core"></div>
          </div>
        </div>
        
        <div className="loading-text-container">
          <h2 className="loading-title">TrustedHands</h2>
            <p className="loading-message orange-gradient-text">
            {message || loadingMessages[currentMessage]}
          </p>
        </div>

        <div className="loading-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
