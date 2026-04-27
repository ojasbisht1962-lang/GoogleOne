import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { walletService } from '../../services/apiService';
import { toast } from 'react-toastify';
import '../Customer/Wallet.css';

const Wallet = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, []);

  const fetchWallet = async () => {
    try {
      const data = await walletService.getMyWallet();
      setWallet(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching wallet:', error);
      toast.error('Failed to load wallet');
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const data = await walletService.getTransactions(50);
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const formatCurrency = (value) => {
    return `₹${parseFloat(value).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'credit':
        return '💰';
      case 'debit':
        return '💸';
      case 'lock':
        return '🔒';
      case 'unlock':
      case 'refund':
        return '🔓';
      default:
        return '📝';
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'credit':
      case 'refund':
      case 'unlock':
        return 'transaction-credit';
      case 'debit':
        return 'transaction-debit';
      case 'lock':
        return 'transaction-lock';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="wallet-container">
        <div className="loading">Loading wallet...</div>
      </div>
    );
  }

  return (
    <div className="wallet-container">
      <div className="wallet-header">
        <h1>💳 Earnings Wallet</h1>
      </div>

      {/* Balance Cards - Tasker specific */}
      <div className="balance-cards">
        <div className="balance-card available">
          <div className="balance-icon">💵</div>
          <div className="balance-info">
            <p className="balance-label">Available Balance</p>
            <h2 className="balance-amount">{formatCurrency(wallet?.balance || 0)}</h2>
            <p style={{ color: '#999', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
              Ready to withdraw
            </p>
          </div>
        </div>

        <div className="balance-card total">
          <div className="balance-icon">🎯</div>
          <div className="balance-info">
            <p className="balance-label">Total Earned</p>
            <h2 className="balance-amount">{formatCurrency(wallet?.total_earned || 0)}</h2>
            <p style={{ color: '#999', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
              Lifetime earnings
            </p>
          </div>
        </div>

        <div className="balance-card spent">
          <div className="balance-icon">📊</div>
          <div className="balance-info">
            <p className="balance-label">Completed Bookings</p>
            <h2 className="balance-amount">
              {transactions.filter(t => t.type === 'credit' && t.related_booking_id).length}
            </h2>
            <p style={{ color: '#999', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
              Jobs completed
            </p>
          </div>
        </div>
      </div>

      {/* Withdrawal Notice */}
      <div className="withdrawal-notice">
        <div className="notice-icon">ℹ️</div>
        <div className="notice-content">
          <h4>Withdrawal Information</h4>
          <p>
            Your earnings are automatically transferred to your account after each completed booking.
            You can withdraw your available balance to your bank account or UPI at any time.
          </p>
          <button className="withdraw-btn" disabled>
            🏦 Withdraw Funds (Coming Soon)
          </button>
        </div>
      </div>

      {/* Earnings Breakdown */}
      <div className="earnings-breakdown">
        <h3>📈 Earnings Breakdown</h3>
        <div className="breakdown-grid">
          <div className="breakdown-item">
            <span className="breakdown-label">This Month</span>
            <span className="breakdown-value">
              {formatCurrency(
                transactions
                  .filter(t => {
                    const transDate = new Date(t.created_at);
                    const now = new Date();
                    return (
                      t.type === 'credit' &&
                      t.related_booking_id &&
                      transDate.getMonth() === now.getMonth() &&
                      transDate.getFullYear() === now.getFullYear()
                    );
                  })
                  .reduce((sum, t) => sum + t.amount, 0)
              )}
            </span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-label">Last Month</span>
            <span className="breakdown-value">
              {formatCurrency(
                transactions
                  .filter(t => {
                    const transDate = new Date(t.created_at);
                    const lastMonth = new Date();
                    lastMonth.setMonth(lastMonth.getMonth() - 1);
                    return (
                      t.type === 'credit' &&
                      t.related_booking_id &&
                      transDate.getMonth() === lastMonth.getMonth() &&
                      transDate.getFullYear() === lastMonth.getFullYear()
                    );
                  })
                  .reduce((sum, t) => sum + t.amount, 0)
              )}
            </span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-label">Average per Booking</span>
            <span className="breakdown-value">
              {formatCurrency(
                transactions.filter(t => t.type === 'credit' && t.related_booking_id).length > 0
                  ? transactions
                      .filter(t => t.type === 'credit' && t.related_booking_id)
                      .reduce((sum, t) => sum + t.amount, 0) /
                      transactions.filter(t => t.type === 'credit' && t.related_booking_id).length
                  : 0
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="transactions-section">
        <h2>📜 Payment History</h2>
        {transactions.length === 0 ? (
          <div className="no-transactions">
            <p>No transactions yet. Complete bookings to start earning!</p>
          </div>
        ) : (
          <div className="transactions-list">
            {transactions.map((transaction, index) => (
              <div key={index} className={`transaction-item ${getTransactionColor(transaction.type)}`}>
                <div className="transaction-icon">{getTransactionIcon(transaction.type)}</div>
                <div className="transaction-details">
                  <p className="transaction-description">{transaction.description}</p>
                  <p className="transaction-date">{formatDate(transaction.created_at)}</p>
                  {transaction.related_booking_id && (
                    <p className="transaction-booking">Booking: {transaction.related_booking_id.slice(-8)}</p>
                  )}
                </div>
                <div className="transaction-amount">
                  <span className={transaction.type === 'credit' ? 'positive' : 'negative'}>
                    {transaction.type === 'credit' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </span>
                  <span className={`status-badge status-${transaction.status}`}>
                    {transaction.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wallet;
