import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserProfileMenu from './UserProfileMenu';
import CustomerLocationSelector from './CustomerLocationSelector/CustomerLocationSelector';
import WalletBalance from './WalletBalance';
import './Navbar.css';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isGuest } = useAuth();

  // Add role-based data attribute to body
  React.useEffect(() => {
    if (user?.role) {
      document.body.setAttribute('data-role', user.role);
    }
    return () => {
      document.body.removeAttribute('data-role');
    };
  }, [user?.role]);

  // Don't render authenticated navbar if user is not logged in
  if (!user) {
    return null;
  }

  const getNavigationTabs = () => {
    if (!user) return [];

    switch (user.role) {
      case 'customer':
          return [
            { label: 'Services', path: '/customer/services', icon: '🔧' },
            { label: 'Find Providers', path: '/customer/providers', icon: '⭐' },
            { label: 'Support', path: '/customer/support', icon: '🎧' }
          ];
      
      case 'tasker':
        return [
          { label: 'Dashboard', path: '/tasker/dashboard', icon: '🏠' },
          { label: 'My Services', path: '/tasker/services', icon: '🔧' },
          { label: 'Bookings', path: '/tasker/bookings', icon: '📅' },
          { label: 'Chat', path: '/tasker/chat', icon: '💬' },
          { label: 'Support', path: '/tasker/support', icon: '🎧' }
        ];
      
      case 'superadmin':
        return [
          { label: 'Dashboard', path: '/admin/dashboard', icon: '🏠' },
          { label: 'Verifications', path: '/admin/verifications', icon: '✓' },
          { label: 'AMC', path: '/admin/amc', icon: '📋' },
          { label: 'Payment Settings', path: '/admin/payment-settings', icon: '💳' }
        ];
      
      default:
        return [];
    }
  };

  const navigationTabs = getNavigationTabs();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="app-navbar">
      <div className="navbar-container">
        {/* Logo/Brand */}
        <div className="navbar-brand" onClick={() => navigate('/')}>
          <div className="brand-logo">
            <img src="/logo.png" alt="TrustedHands" className="logo-icon" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            <span className="logo-text">TrustedHands</span>
            {isGuest && (
              <span className="guest-badge">
                🎭 Guest Mode
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="navbar-tabs">
          {navigationTabs.map((tab, index) => (
            <button
              key={index}
              className={`nav-tab ${isActive(tab.path) ? 'active' : ''}`}
              onClick={() => navigate(tab.path)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* User Profile Menu */}
        <div className="navbar-profile">
          {user.role === 'customer' && <CustomerLocationSelector compact={true} />}
          <WalletBalance />
          <UserProfileMenu />
        </div>
      </div>
    </nav>
  );
}
