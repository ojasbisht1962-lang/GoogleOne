import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import config from '../../config';
import './SuperAdminProfile.css';

export default function SuperAdminProfile() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
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
          phone: formData.phone
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
    <>      <div className="superadmin-profile">
        <div className="profile-header">
          <h1>🛡️ Admin Profile</h1>
          <p>Manage your administrator account</p>
        </div>

        <div className="profile-content">
          <div className="profile-card">
            <div className="profile-avatar-section">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt={user.name} className="profile-pic" />
              ) : (
                <div className="profile-pic-placeholder admin">
                  {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
              )}
            </div>
            <div className="profile-info">
              <h2>{user?.name}</h2>
              <p className="profile-role admin">SuperAdmin</p>
              <p className="profile-email">{user?.email}</p>
            </div>
          </div>

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

            <button 
              type="submit" 
              className="save-btn"
              disabled={loading}
            >
              {loading ? '💾 Saving...' : '💾 Save Changes'}
            </button>
          </form>
        </div>

        <div className="profile-stats-card">
          <h3>Admin Privileges</h3>
          <div className="privileges-list">
            <div className="privilege-item">
              <div className="privilege-icon">👥</div>
              <div className="privilege-details">
                <p className="privilege-name">User Management</p>
                <p className="privilege-desc">Full control over all users</p>
              </div>
            </div>

            <div className="privilege-item">
              <div className="privilege-icon">✓</div>
              <div className="privilege-details">
                <p className="privilege-name">Verification Control</p>
                <p className="privilege-desc">Approve/reject verifications</p>
              </div>
            </div>

            <div className="privilege-item">
              <div className="privilege-icon">📋</div>
              <div className="privilege-details">
                <p className="privilege-name">Booking Management</p>
                <p className="privilege-desc">View and manage all bookings</p>
              </div>
            </div>

            <div className="privilege-item">
              <div className="privilege-icon">💰</div>
              <div className="privilege-details">
                <p className="privilege-name">Price Range Control</p>
                <p className="privilege-desc">Set service price ranges</p>
              </div>
            </div>

            <div className="privilege-item">
              <div className="privilege-icon">🔒</div>
              <div className="privilege-details">
                <p className="privilege-name">System Access</p>
                <p className="privilege-desc">Full platform access</p>
              </div>
            </div>
          </div>
        </div>
      </div>    </>
  );
}
