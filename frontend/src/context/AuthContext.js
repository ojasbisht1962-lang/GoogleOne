import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/apiService';
import LoadingScreen from '../components/LoadingScreen';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = authService.getToken();
    const storedUser = authService.getCurrentUser();
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }
    setTimeout(() => setLoading(false), 800);
  }, []);

  const login = (token, userData) => {
    authService.setAuth(token, userData);
    setToken(token);
    setUser(userData);
    setLoading(false);
  };

  const logout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Role switching disabled for security
  // Users must register separately for different roles

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!token,
    isGuest: user?.isGuest === true,
    isCustomer: user?.role === 'customer',
    isTasker: user?.role === 'tasker',
    isSuperAdmin: user?.role === 'superadmin',
  };

  if (loading) {
    return <LoadingScreen message="🚀 Initializing TrustedHands..." />;
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
