import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/apiService';
import { toast } from 'react-toastify';
import './Login.css';

const Login = () => {
  const [selectedRole, setSelectedRole] = useState('customer');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const redirectByRole = (role) => {
    // Redirect based on role to their respective dashboards
    if (role === 'customer') {
      navigate('/customer/dashboard');
    } else if (role === 'tasker') {
      navigate('/tasker/dashboard');
    } else if (role === 'superadmin') {
      navigate('/admin/dashboard');
    }
  };

  const handleGuestLogin = () => {
    try {
      const guestUser = {
        _id: 'guest_' + Date.now(),
        name: 'Guest User',
        email: 'guest@trustedhands.com',
        role: 'customer',
        roles: ['customer'],
        isGuest: true,
        created_at: new Date().toISOString()
      };

      const guestToken = 'guest_token_' + Date.now();
      login(guestToken, guestUser);
      toast.success('Welcome, Guest! Browse our services.');
      
      setTimeout(() => {
        navigate('/customer/dashboard');
      }, 100);
    } catch (error) {
      console.error('Guest login error:', error);
      toast.error('Failed to login as guest');
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const result = await authService.googleLogin(tokenResponse.access_token, selectedRole);
        const userRoles = Array.isArray(result.user?.roles)
          ? result.user.roles
          : (result.user?.role ? [result.user.role] : []);
        const effectiveRole = userRoles.includes(selectedRole)
          ? selectedRole
          : result.user?.role;
        const normalizedUser = {
          ...result.user,
          role: effectiveRole,
          roles: userRoles,
        };

        login(result.access_token, normalizedUser);
        toast.success(`Welcome ${result.user.name}!`);
        redirectByRole(effectiveRole);
      } catch (error) {
        console.error('Google login error:', error);
        toast.error(error.response?.data?.detail || 'Google login failed');
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      toast.error('Google login failed');
    },
  });

  return (
    <div className="login-container">
      <div className="login-box scale-in">
        <div className="login-header">
          <h1>
            <img src="/logo.png" alt="TrustedHands" style={{ width: '42px', height: '42px', objectFit: 'contain', marginRight: '10px', verticalAlign: 'middle' }} />
            Welcome to TrustedHands
          </h1>
          <p>Sign in to access your account</p>
        </div>

        {/* Role Selector */}
        <div className="role-selector">
          <h3>I am a:</h3>
          <div className="role-buttons">
            <button
              className={`role-btn ${selectedRole === 'customer' ? 'active' : ''}`}
              onClick={() => setSelectedRole('customer')}
              type="button"
            >
              <span className="role-icon">👤</span>
              <span>Customer</span>
            </button>
            <button
              className={`role-btn ${selectedRole === 'tasker' ? 'active' : ''}`}
              onClick={() => setSelectedRole('tasker')}
              type="button"
            >
              <span className="role-icon">⚡</span>
              <span>Tasker</span>
            </button>
            <button
              className={`role-btn ${selectedRole === 'superadmin' ? 'active' : ''}`}
              onClick={() => setSelectedRole('superadmin')}
              type="button"
            >
              <span className="role-icon">👑</span>
              <span>Admin</span>
            </button>
          </div>
        </div>

        {/* Google Login */}
        <button
          className="google-login-btn"
          onClick={handleGoogleLogin}
          disabled={loading}
          type="button"
        >
          {loading ? (
            <div className="spinner"></div>
          ) : (
            <>
              <img
                src="https://www.google.com/favicon.ico"
                alt="Google"
                width="20"
                height="20"
              />
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Guest Login (Only for customers) */}
        {selectedRole === 'customer' && (
          <>
            <div className="divider">
              <span>OR</span>
            </div>
            <button
              className="guest-login-btn"
              onClick={handleGuestLogin}
              disabled={loading}
              type="button"
            >
              {loading ? (
                <div className="spinner"></div>
              ) : (
                <>
                  <span className="guest-icon">🎭</span>
                  <span>Browse as Guest</span>
                </>
              )}
            </button>
          </>
        )}

        <div className="login-footer">
          <p>
            By continuing, you agree to our{' '}
            <a href="https://trusted-hands.vercel.app/terms-of-service" target="_blank" rel="noopener noreferrer">Terms of Service</a> and{' '}
            <a href="https://trusted-hands.vercel.app/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
