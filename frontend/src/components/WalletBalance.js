import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { walletService } from '../services/apiService';
import './WalletBalance.css';

export default function WalletBalance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalance();
    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchBalance = async () => {
    try {
      const data = await walletService.getBalance();
      setBalance(data.balance || 0);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (user?.role === 'customer') {
      navigate('/customer/wallet');
    } else if (user?.role === 'tasker') {
      navigate('/tasker/wallet');
    }
  };

  if (!user || user.role === 'superadmin') {
    return null;
  }

  return (
    <div className="wallet-balance-widget" onClick={handleClick} title="View Wallet">
      <div className="wallet-icon">💰</div>
      <div className="wallet-info">
        <span className="wallet-label">Wallet</span>
        <span className="wallet-amount">
          {loading ? '...' : `₹${balance.toFixed(2)}`}
        </span>
      </div>
    </div>
  );
}
