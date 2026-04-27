import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { walletService } from '../../services/apiService';
import { toast } from 'react-toastify';
import './Wallet.css';

const Wallet = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');

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

  const handleAddFunds = async (e) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const data = await walletService.addFunds(parseFloat(amount), paymentMethod);
      
      toast.success(data.message);
      setShowAddFunds(false);
      setAmount('');
      fetchWallet();
      fetchTransactions();
    } catch (error) {
      console.error('Error adding funds:', error);
      toast.error(error.response?.data?.detail || 'Failed to add funds');
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
        <h1>💳 My Wallet</h1>
        <button className="add-funds-btn" onClick={() => setShowAddFunds(true)}>
          + Add Funds
        </button>
      </div>

      {/* Balance Cards */}
      <div className="balance-cards">
        <div className="balance-card available">
          <div className="balance-icon">💵</div>
          <div className="balance-info">
            <p className="balance-label">Available Balance</p>
            <h2 className="balance-amount">{formatCurrency(wallet?.balance || 0)}</h2>
          </div>
        </div>

        <div className="balance-card locked">
          <div className="balance-icon">🔒</div>
          <div className="balance-info">
            <p className="balance-label">Locked (Pending Bookings)</p>
            <h2 className="balance-amount">{formatCurrency(wallet?.locked_balance || 0)}</h2>
          </div>
        </div>

        <div className="balance-card total">
          <div className="balance-icon">💎</div>
          <div className="balance-info">
            <p className="balance-label">Total Balance</p>
            <h2 className="balance-amount">
              {formatCurrency((wallet?.balance || 0) + (wallet?.locked_balance || 0))}
            </h2>
          </div>
        </div>

        <div className="balance-card spent">
          <div className="balance-icon">📊</div>
          <div className="balance-info">
            <p className="balance-label">Total Spent</p>
            <h2 className="balance-amount">{formatCurrency(wallet?.total_spent || 0)}</h2>
          </div>
        </div>
      </div>

      {/* Add Funds Modal */}
      {showAddFunds && (
        <div className="modal-overlay" onClick={() => setShowAddFunds(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💳 Add Funds to Wallet</h3>
              <button className="close-btn" onClick={() => setShowAddFunds(false)}>×</button>
            </div>
            <form onSubmit={handleAddFunds} className="add-funds-form">
              <div className="form-group">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="1"
                  step="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label>Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="upi">UPI</option>
                  <option value="card">Debit/Credit Card</option>
                  <option value="netbanking">Net Banking</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddFunds(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Add Funds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="transactions-section">
        <h2>📜 Transaction History</h2>
        {transactions.length === 0 ? (
          <div className="no-transactions">
            <p>No transactions yet</p>
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
                  <span className={transaction.type === 'credit' || transaction.type === 'refund' ? 'positive' : 'negative'}>
                    {transaction.type === 'credit' || transaction.type === 'refund' ? '+' : '-'}
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
