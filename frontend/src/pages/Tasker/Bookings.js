import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingService } from '../../services/apiService';
import api from '../../services/api';
import { toast } from 'react-toastify';
import LoadingScreen from '../../components/LoadingScreen';
import './Bookings.css';

export default function Bookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, accepted, in_progress, completed
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await bookingService.getMyBookings(null, 'tasker');
      data.forEach((booking, index) => {
      });
      setBookings(data);
    } catch (error) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      await bookingService.updateBookingStatus(bookingId, newStatus);
      toast.success(`Booking ${newStatus}!`);
      fetchBookings();
      setSelectedBooking(null);
    } catch (error) {
      toast.error('Failed to update booking status');
    }
  };

  const handleChatWithCustomer = async (customerId) => {
    try {
      // Check if chat already exists
      const response = await api.get('/chat/conversations');
      const existingChat = response.data.find(chat => chat.customer_id === customerId);
      
      if (existingChat) {
        navigate(`/tasker/chat/${existingChat._id}`);
      } else {
        // Create initial message to start chat
        const chatResponse = await api.post('/chat/send', {
          recipient_id: customerId,
          content: 'Hello! Thank you for booking my service. How can I help you?'
        });
        
        if (chatResponse.data.chat_id) {
          navigate(`/tasker/chat/${chatResponse.data.chat_id}`);
        }
      }
    } catch (error) {
      console.error('Failed to start chat:', error);
      toast.error('Failed to open chat');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      accepted: '#2196f3',
      in_progress: '#ff9800',
      completed: '#4caf50',
      cancelled: '#f44336',
      rejected: '#9e9e9e'
    };
    return colors[status] || '#666';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      accepted: '✓',
      in_progress: '🔧',
      completed: '✅',
      cancelled: '❌',
      rejected: '⛔'
    };
    return icons[status] || '📋';
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    return booking.status === filter;
  });

  const getBookingStats = () => {
    return {
      all: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      accepted: bookings.filter(b => b.status === 'accepted').length,
      in_progress: bookings.filter(b => b.status === 'in_progress').length,
      completed: bookings.filter(b => b.status === 'completed').length,
    };
  };

  const stats = getBookingStats();

  if (loading) {
    return (
      <>
  <LoadingScreen message="Firing Up The Engines" />
      </>
    );
  }

  return (
    <>
      <div className="bookings-container">
        <div className="bookings-header">
          <div>
            <h1>📋 My Bookings</h1>
            <p>Manage all your service bookings</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button 
          className={`tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({stats.all})
        </button>
        <button 
          className={`tab ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          ⏳ Pending ({stats.pending})
        </button>
        <button 
          className={`tab ${filter === 'accepted' ? 'active' : ''}`}
          onClick={() => setFilter('accepted')}
        >
          ✓ Accepted ({stats.accepted})
        </button>
        <button 
          className={`tab ${filter === 'in_progress' ? 'active' : ''}`}
          onClick={() => setFilter('in_progress')}
        >
          🔧 In Progress ({stats.in_progress})
        </button>
        <button 
          className={`tab ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          ✅ Completed ({stats.completed})
        </button>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h2>No {filter !== 'all' ? filter : ''} bookings</h2>
          <p>Your bookings will appear here</p>
        </div>
      ) : (
        <div className="bookings-list">
          {filteredBookings.map(booking => (
            <div key={booking._id} className="booking-item">
              <div className="booking-main">
                <div 
                  className="status-indicator"
                  style={{ background: getStatusColor(booking.status) }}
                >
                  {getStatusIcon(booking.status)}
                </div>
                
                <div className="booking-info">
                  <div className="booking-title-row">
                    <h3>{booking.service_name || 'Service Booking'}</h3>
                    <span className="booking-price">₹{booking.total_price}</span>
                  </div>
                  
                  <div className="booking-details-grid">
                    <div className="detail">
                      <span className="icon">👤</span>
                      <span>{booking.customer_name}</span>
                    </div>
                    <div className="detail">
                      <span className="icon">📅</span>
                      <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                    </div>
                    <div className="detail">
                      <span className="icon">⏰</span>
                      <span>{booking.booking_time || 'Flexible'}</span>
                    </div>
                    <div className="detail">
                      <span className="icon">📍</span>
                      <span>{booking.address?.substring(0, 30)}...</span>
                    </div>
                  </div>
                  
                  {booking.description && (
                    <p className="booking-description">
                      💬 {booking.description}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="booking-actions">
                {booking.status === 'pending' && (
                  <>
                    <button 
                      className="btn-action accept"
                      onClick={() => handleStatusUpdate(booking._id, 'accepted')}
                    >
                      ✓ Accept
                    </button>
                    <button 
                      className="btn-action reject"
                      onClick={() => handleStatusUpdate(booking._id, 'rejected')}
                    >
                      ✗ Reject
                    </button>
                  </>
                )}
                
                {booking.status === 'accepted' && (
                  <>
                    <button 
                      className="btn-action start"
                      onClick={() => handleStatusUpdate(booking._id, 'in_progress')}
                    >
                      🔧 Start Work
                    </button>
                    <button 
                      className="btn-action chat"
                      onClick={() => handleChatWithCustomer(booking.customer_id)}
                    >
                      💬 Chat
                    </button>
                  </>
                )}
                
                {booking.status === 'in_progress' && (
                  <>
                    <button 
                      className="btn-action complete"
                      onClick={() => handleStatusUpdate(booking._id, 'completed')}
                    >
                      ✅ Mark Complete
                    </button>
                    <button 
                      className="btn-action chat"
                      onClick={() => handleChatWithCustomer(booking.customer_id)}
                    >
                      💬 Chat
                    </button>
                  </>
                )}
                
                <button 
                  className="btn-action details"
                  onClick={() => setSelectedBooking(booking)}
                >
                  👁️ View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="modal-overlay" onClick={() => setSelectedBooking(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Booking Details</h2>
              <button className="btn-close" onClick={() => setSelectedBooking(null)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="detail-section">
                <h3>Service Information</h3>
                <div className="detail-row">
                  <span className="label">Service:</span>
                  <span className="value">{selectedBooking.service_name}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Status:</span>
                  <span 
                    className="value status-badge"
                    style={{ background: getStatusColor(selectedBooking.status) }}
                  >
                    {getStatusIcon(selectedBooking.status)} {selectedBooking.status.toUpperCase()}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Price:</span>
                  <span className="value price">₹{selectedBooking.total_price}</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Customer Information</h3>
                <div className="detail-row">
                  <span className="label">Name:</span>
                  <span className="value">{selectedBooking.customer_name}</span>
                </div>
                {selectedBooking.customer_phone && (
                  <div className="detail-row">
                    <span className="label">Phone:</span>
                    <span className="value">{selectedBooking.customer_phone}</span>
                  </div>
                )}
              </div>

              <div className="detail-section">
                <h3>Booking Details</h3>
                <div className="detail-row">
                  <span className="label">Date:</span>
                  <span className="value">{new Date(selectedBooking.booking_date).toLocaleDateString('en-IN', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Time:</span>
                  <span className="value">{selectedBooking.booking_time || 'Flexible'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Address:</span>
                  <span className="value">{selectedBooking.address}</span>
                </div>
                {selectedBooking.description && (
                  <div className="detail-row">
                    <span className="label">Description:</span>
                    <span className="value">{selectedBooking.description}</span>
                  </div>
                )}
              </div>

              <div className="detail-section">
                <h3>Timeline</h3>
                <div className="detail-row">
                  <span className="label">Booked on:</span>
                  <span className="value">{new Date(selectedBooking.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
