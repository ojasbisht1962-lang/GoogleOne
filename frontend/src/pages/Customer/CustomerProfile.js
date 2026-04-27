import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import config from '../../config';
import CustomerLocationSelector from '../../components/CustomerLocationSelector/CustomerLocationSelector';
import './CustomerProfile.css';

export default function CustomerProfile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    email: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');
  const response = await fetch(`${config.API_BASE_URL}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          address: formData.address
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedUser = await response.json();
      
      // Update user in localStorage and context
      const storedUser = JSON.parse(localStorage.getItem('user'));
      const newUser = { ...storedUser, ...updatedUser };
      localStorage.setItem('user', JSON.stringify(newUser));
      
      if (updateUser) {
        updateUser(newUser);
      }

      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>      <div className="customer-profile">
        <div className="profile-header">
          <h1>👤 My Profile</h1>
          <p>Manage your account information</p>
        </div>

        <div className="profile-content">
          <div className="profile-main-card">
            <div className="profile-avatar-section">
              <div className="profile-pic-container">
                {user?.profile_picture && user.profile_picture !== '' ? (
                  <img 
                    src={user.profile_picture} 
                    alt={user.name} 
                    className="profile-pic"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className="profile-pic-placeholder"
                  style={{ display: user?.profile_picture && user.profile_picture !== '' ? 'none' : 'flex' }}
                >
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              </div>
              <div className="profile-info">
                <h2>{user?.name}</h2>
                <p className="profile-role">Customer</p>
                <p className="profile-email">{user?.email}</p>
              </div>
            </div>

            <div className="divider"></div>

            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="disabled-input"
                />
                <small className="form-hint">Email cannot be changed</small>
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                />
              </div>

              <div className="form-group">
                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Enter your address"
                />
              </div>

              <div className="form-group">
                <label>📍 Saved Location</label>
                <div className="location-info-card">
                  {user?.customer_location ? (
                    <>
                      <div className="location-summary">
                        <div className="location-header">
                          <span className="location-icon">📍</span>
                          <div className="location-main">
                            <h4>{user.customer_location.city}</h4>
                            {user.customer_location.fullAddress ? (
                              <p className="full-address">{user.customer_location.fullAddress}</p>
                            ) : (
                              <p className="location-address">{user.customer_location.address}</p>
                            )}
                          </div>
                        </div>
                        
                        {user.customer_location.addressDetails && (
                          <div className="address-details-grid">
                            {user.customer_location.addressDetails.houseNo && (
                              <div className="detail-item">
                                <span className="detail-label">🏠 House/Flat:</span>
                                <span className="detail-value">{user.customer_location.addressDetails.houseNo}</span>
                              </div>
                            )}
                            {user.customer_location.addressDetails.street && (
                              <div className="detail-item">
                                <span className="detail-label">🛣️ Street:</span>
                                <span className="detail-value">{user.customer_location.addressDetails.street}</span>
                              </div>
                            )}
                            {user.customer_location.addressDetails.landmark && (
                              <div className="detail-item">
                                <span className="detail-label">📌 Landmark:</span>
                                <span className="detail-value">{user.customer_location.addressDetails.landmark}</span>
                              </div>
                            )}
                            {user.customer_location.addressDetails.area && (
                              <div className="detail-item">
                                <span className="detail-label">🗺️ Area:</span>
                                <span className="detail-value">{user.customer_location.addressDetails.area}</span>
                              </div>
                            )}
                            {user.customer_location.addressDetails.pincode && (
                              <div className="detail-item">
                                <span className="detail-label">📮 PIN Code:</span>
                                <span className="detail-value">{user.customer_location.addressDetails.pincode}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {user.customer_location.coordinates && (
                          <div className="coordinates-info">
                            <small>📍 Lat: {user.customer_location.coordinates.lat.toFixed(6)}, Lng: {user.customer_location.coordinates.lng.toFixed(6)}</small>
                          </div>
                        )}
                      </div>
                      
                      <button 
                        type="button"
                        className="btn-change-location"
                        onClick={() => setShowLocationModal(true)}
                      >
                        ✏️ Change Location
                      </button>
                    </>
                  ) : (
                    <div className="no-location-set">
                      <span className="no-location-icon">📍</span>
                      <p>No location saved yet</p>
                      <button 
                        type="button"
                        className="btn-set-location"
                        onClick={() => setShowLocationModal(true)}
                      >
                        📍 Set Location Now
                      </button>
                    </div>
                  )}
                </div>
                <small className="form-hint">Your saved location helps us provide better service recommendations and accurate distance calculations</small>
              </div>

              <button 
                type="submit" 
                className="save-btn"
                disabled={loading}
              >
                {loading ? '💾 Saving...' : '💾 Save Changes'}
              </button>
            </form>
          </div>

          <div className="profile-sidebar">
            <div className="profile-stats-card">
              <h3>Account Statistics</h3>
              <div className="stats-list">
                <div className="stat-item">
                  <div className="stat-icon">📅</div>
                  <div className="stat-details">
                    <p className="stat-label">Member Since</p>
                    <p className="stat-value">
                      {user?.created_at 
                        ? new Date(user.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            year: 'numeric' 
                          })
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="stat-item">
                  <div className="stat-icon">🔒</div>
                  <div className="stat-details">
                    <p className="stat-label">Account Type</p>
                    <p className="stat-value">Google Account</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="profile-stats-card" style={{ marginTop: '20px' }}>
              <h3>🔒 Safety & Preferences</h3>
              <button 
                onClick={() => navigate('/customer/gender-preference-settings')}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: 'linear-gradient(135deg, #FDB913 0%, #F5A623 100%)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginTop: '12px',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 24px rgba(253, 185, 19, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <span>⚙️</span>
                Gender Preference Settings
              </button>
              <p style={{ 
                fontSize: '13px', 
                color: '#B0B0B0', 
                marginTop: '10px',
                lineHeight: '1.5'
              }}>
                Configure your preferences for service provider gender matching
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Location Change Modal */}
      {showLocationModal && (
        <div className="location-modal-overlay" onClick={() => setShowLocationModal(false)}>
          <div className="location-modal-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="location-modal-header">
              <h3>📍 Update Your Location</h3>
              <button className="modal-close-btn" onClick={() => setShowLocationModal(false)}>×</button>
            </div>
            <div className="location-modal-body">
              <CustomerLocationSelector 
                compact={true} 
                onLocationUpdate={() => {
                  setShowLocationModal(false);
                  toast.success('Location updated successfully!');
                }}
              />
            </div>
          </div>
        </div>
      )}    </>
  );
}
