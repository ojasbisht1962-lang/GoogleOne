import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingService } from '../../services/apiService';
import { toast } from 'react-toastify';
import api from '../../services/api';
import LoadingScreen from '../../components/LoadingScreen';
import './MyBookings.css';

export default function MyBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await bookingService.getMyBookings(null, 'customer');
      setBookings(data);
    } catch (error) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      accepted: '#3b82f6',
      in_progress: '#8b5cf6',
      completed: '#10b981',
      cancelled: '#ef4444',
      rejected: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      accepted: '✅',
      in_progress: '🔄',
      completed: '✓',
      cancelled: '❌',
      rejected: '⛔'
    };
    return icons[status] || '📋';
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    try {
      await bookingService.updateBookingStatus(bookingId, 'cancelled');
      toast.success('Booking cancelled successfully');
      fetchBookings();
      setShowDetailsModal(false);
    } catch (error) {
      toast.error('Failed to cancel booking');
    }
  };
  const handleRateBooking = async (e) => {
    e.preventDefault();
    
    try {
      await bookingService.rateBooking(selectedBooking._id, rating, review);
      toast.success('Thank you for your feedback!');
      setShowRatingModal(false);
      setRating(5);
      setReview('');
      fetchBookings();
    } catch (error) {
      toast.error('Failed to submit rating');
    }
  };

  const handleChatWithTasker = async (taskerId) => {
    try {
      // Check if chat already exists
      const response = await api.get('/chat/conversations');
      const existingChat = response.data.find(chat => chat.tasker_id === taskerId);
      
      if (existingChat) {
        navigate(`/customer/chat/${existingChat._id}`);
      } else {
        // Create initial message to start chat
        const chatResponse = await api.post('/chat/send', {
          recipient_id: taskerId,
          content: 'Hello! I would like to discuss the booking.'
        });
        
        if (chatResponse.data.chat_id) {
          navigate(`/customer/chat/${chatResponse.data.chat_id}`);
        }
      }
    } catch (error) {
      console.error('Failed to start chat:', error);
      toast.error('Failed to open chat');
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    return booking.status === filter;
  });

  const filterCounts = {
    all: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    accepted: bookings.filter(b => b.status === 'accepted').length,
    in_progress: bookings.filter(b => b.status === 'in_progress').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length
  };

  if (loading) {
    return (
      <>  <LoadingScreen message="Firing Up The Engines" />      </>
    );
  }

  return (
    <>      <div className="my-bookings-container">
        <div className="bookings-header">
        <h1>📋 My Bookings</h1>
        <p>Track and manage your service bookings</p>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All ({filterCounts.all})
        </button>
        <button 
          className={filter === 'pending' ? 'active' : ''}
          onClick={() => setFilter('pending')}
        >
          Pending ({filterCounts.pending})
        </button>
        <button 
          className={filter === 'accepted' ? 'active' : ''}
          onClick={() => setFilter('accepted')}
        >
          Accepted ({filterCounts.accepted})
        </button>
        <button 
          className={filter === 'in_progress' ? 'active' : ''}
          onClick={() => setFilter('in_progress')}
        >
          In Progress ({filterCounts.in_progress})
        </button>
        <button 
          className={filter === 'completed' ? 'active' : ''}
          onClick={() => setFilter('completed')}
        >
          Completed ({filterCounts.completed})
        </button>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h2>No Bookings Found</h2>
          <p>You don't have any {filter !== 'all' ? filter : ''} bookings yet</p>
        </div>
      ) : (
        <div className="bookings-grid">
          {filteredBookings.map(booking => (
            <div key={booking._id} className="booking-card">
              <div className="booking-card-header">
                <div 
                  className="status-badge" 
                  style={{ backgroundColor: getStatusColor(booking.status) }}
                >
                  {getStatusIcon(booking.status)} {booking.status.replace('_', ' ').toUpperCase()}
                </div>
                <span className="booking-id">#{booking._id.slice(-6)}</span>
              </div>

              <h3>{booking.service?.title || 'Service'}</h3>
              
              <div className="booking-actions">
                <button 
                  className="btn-view-details"
                  onClick={() => {
                    setSelectedBooking(booking);
                    setShowDetailsModal(true);
                  }}
                >
                  View Details
                </button>
                
                {booking.tasker?._id && (
                  <button 
                    className="btn-chat"
                    onClick={() => handleChatWithTasker(booking.tasker._id)}
                  >
                    💬 Chat
                  </button>
                )}
                
                {booking.status === 'pending' && (
                  <button 
                    className="btn-cancel"
                    onClick={() => handleCancelBooking(booking._id)}
                  >
                    Cancel
                  </button>
                )}
                
                {booking.status === 'completed' && !booking.rating && (
                  <button 
                    className="btn-rate"
                    onClick={() => {
                      setSelectedBooking(booking);
                      setShowRatingModal(true);
                    }}
                  >
                    ⭐ Rate Service
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedBooking && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Booking Details</h2>
              <button className="btn-close" onClick={() => setShowDetailsModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div 
                className="status-badge-large" 
                style={{ backgroundColor: getStatusColor(selectedBooking.status) }}
              >
                {getStatusIcon(selectedBooking.status)} {selectedBooking.status.replace('_', ' ').toUpperCase()}
              </div>

              <h3>{selectedBooking.service?.title}</h3>
              <p className="service-description">{selectedBooking.service?.description}</p>

              <div className="details-grid">
                <div className="detail-item">
                  <span className="label">Booking ID</span>
                  <span className="value">#{selectedBooking._id.slice(-8)}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Tasker</span>
                  <span className="value">{selectedBooking.tasker?.name}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Phone</span>
                  <span className="value">{selectedBooking.tasker?.phone || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Scheduled Date</span>
                  <span className="value">
                    {new Date(selectedBooking.scheduled_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">Time</span>
                  <span className="value">{selectedBooking.scheduled_time}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Location</span>
                  <span className="value">{selectedBooking.location}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Total Price</span>
                  <span className="value price">₹{selectedBooking.total_price}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Created At</span>
                  <span className="value">
                    {new Date(selectedBooking.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {selectedBooking.notes && (
                <div className="notes-section">
                  <strong>Notes:</strong>
                  <p>{selectedBooking.notes}</p>
                </div>
              )}

              {selectedBooking.rating && (
                <div className="rating-section">
                  <strong>Your Rating:</strong>
                  <div className="rating-display">
                    {'⭐'.repeat(selectedBooking.rating)}
                  </div>
                  {selectedBooking.review && <p>{selectedBooking.review}</p>}
                </div>
              )}

              {/* Action Buttons in Modal */}
              <div className="modal-actions">
                {selectedBooking.tasker?._id && (
                  <button 
                    className="btn-chat-modal"
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleChatWithTasker(selectedBooking.tasker._id);
                    }}
                  >
                    💬 Chat with Tasker
                  </button>
                )}
                {selectedBooking.status === 'pending' && (
                  <button 
                    className="btn-cancel-modal"
                    onClick={() => handleCancelBooking(selectedBooking._id)}
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && selectedBooking && (
        <div className="modal-overlay" onClick={() => setShowRatingModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Rate Your Experience</h2>
              <button className="btn-close" onClick={() => setShowRatingModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleRateBooking}>
              <div className="rating-form">
                <h3>{selectedBooking.service?.title}</h3>
                
                <div className="rating-input">
                  <label>Rating</label>
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map(star => (
                      <span
                        key={star}
                        className={`star ${rating >= star ? 'filled' : ''}`}
                        onClick={() => setRating(star)}
                      >
                        ⭐
                      </span>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Review (Optional)</label>
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    rows="4"
                    placeholder="Share your experience..."
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowRatingModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit">
                    Submit Rating
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>    </>
  );
}
