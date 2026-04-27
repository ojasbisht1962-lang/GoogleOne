import React, { useState, useEffect } from 'react';
import './QuickRebookModal.css';
import { toast } from 'react-toastify';
import api from '../../services/api';

const QuickRebookModal = ({ provider, onClose, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [previousBooking, setPreviousBooking] = useState(null);
  const [bookingData, setBookingData] = useState({
    scheduled_date: '',
    scheduled_time: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    fetchPreviousBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const fetchPreviousBooking = async () => {
    try {
      const response = await api.get(`/bookings/previous-with-provider/${provider._id}`);
      if (response.data) {
        setPreviousBooking(response.data);
        
        // Pre-fill form with previous booking data
        setBookingData({
          scheduled_date: '',
          scheduled_time: response.data.scheduled_time || '',
          address: response.data.address || '',
          notes: response.data.notes || ''
        });
      }
    } catch (error) {
      console.error('Error fetching previous booking:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBookingData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleQuickRebook = async () => {
    // Validation
    if (!bookingData.scheduled_date) {
      toast.error('Please select a date');
      return;
    }
    if (!bookingData.scheduled_time) {
      toast.error('Please select a time');
      return;
    }
    if (!bookingData.address) {
      toast.error('Please enter your address');
      return;
    }

    setLoading(true);
    try {
      const rebookData = {
        provider_id: provider._id,
        service_id: previousBooking?.service_id,
        scheduled_date: bookingData.scheduled_date,
        scheduled_time: bookingData.scheduled_time,
        address: bookingData.address,
        notes: bookingData.notes
      };

      await api.post('/provider-selection/quick-rebook', rebookData);
      
      toast.success('Booking created successfully!');
      onComplete();
    } catch (error) {
      console.error('Error creating quick rebook:', error);
      toast.error(error.response?.data?.detail || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <div className="quick-rebook-modal-overlay" onClick={onClose}>
      <div className="quick-rebook-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔄 Quick Rebook with {provider.name}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {previousBooking && (
            <div className="previous-booking-info">
              <h3>Previous Booking Details</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Service:</span>
                  <span className="info-value">{previousBooking.service_name}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Rating Given:</span>
                  <span className="info-value">
                    {'⭐'.repeat(previousBooking.rating || 0)} ({previousBooking.rating || 0}/5)
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Previous Date:</span>
                  <span className="info-value">
                    {new Date(previousBooking.scheduled_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="booking-form">
            <h3>New Booking Details</h3>
            
            <div className="form-group">
              <label htmlFor="scheduled_date">
                <span className="label-icon">📅</span>
                Date <span className="required">*</span>
              </label>
              <input
                type="date"
                id="scheduled_date"
                name="scheduled_date"
                value={bookingData.scheduled_date}
                onChange={handleInputChange}
                min={getTomorrowDate()}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="scheduled_time">
                <span className="label-icon">🕐</span>
                Time <span className="required">*</span>
              </label>
              <input
                type="time"
                id="scheduled_time"
                name="scheduled_time"
                value={bookingData.scheduled_time}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="address">
                <span className="label-icon">📍</span>
                Address <span className="required">*</span>
              </label>
              <textarea
                id="address"
                name="address"
                value={bookingData.address}
                onChange={handleInputChange}
                placeholder="Enter your full address"
                rows="3"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes">
                <span className="label-icon">📝</span>
                Additional Notes (Optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={bookingData.notes}
                onChange={handleInputChange}
                placeholder="Any special instructions or requirements"
                rows="3"
              />
            </div>
          </div>

          <div className="provider-summary">
            <div className="provider-summary-avatar">
              {provider.profile_picture ? (
                <img src={provider.profile_picture} alt={provider.name} />
              ) : (
                <div className="avatar-placeholder">
                  {provider.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="provider-summary-info">
              <h4>{provider.name}</h4>
              <div className="provider-rating">
                {'⭐'.repeat(Math.round(provider.average_rating || 0))}
                <span>{(provider.average_rating || 0).toFixed(1)}</span>
              </div>
              {provider.distance && (
                <div className="provider-distance">
                  📍 {provider.distance.toFixed(1)} km away
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="cancel-btn" 
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className="rebook-btn" 
            onClick={handleQuickRebook}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner">⏳</span> Creating Booking...
              </>
            ) : (
              <>🔄 Confirm Quick Rebook</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickRebookModal;
