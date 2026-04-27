import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import config from '../../config';
import LoadingScreen from '../../components/LoadingScreen';
import './BookingManagement.css';

export default function BookingManagement() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${config.API_BASE_URL}/admin/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        toast.error('Session expired. Please login again.');
        window.location.href = '/login';
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch bookings');
      
      const data = await response.json();
      const bookingsArray = Array.isArray(data) ? data : (data.bookings || []);
      
      // Debug: Log the first booking to see what fields are present
      if (bookingsArray.length > 0) {
      }
      
      setBookings(bookingsArray);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    return booking.status === filter;
  });

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      accepted: '#3b82f6',
      in_progress: '#8b5cf6',
      completed: '#10b981',
      cancelled: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      accepted: '✓',
      in_progress: '🔄',
      completed: '✅',
      cancelled: '❌'
    };
    return icons[status] || '📋';
  };

  if (loading) {
    return (
      <>
  <LoadingScreen message="Firing Up The Engines" />
      </>
    );
  }

  return (
    <>
      <div className="booking-management">
        <div className="page-header">
          <h1>📅 Booking Management</h1>
          <p>View and manage all bookings</p>
        </div>

        <div className="filter-tabs">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
            All ({bookings.length})
          </button>
          <button className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>
            ⏳ Pending ({bookings.filter(b => b.status === 'pending').length})
          </button>
        <button className={filter === 'accepted' ? 'active' : ''} onClick={() => setFilter('accepted')}>
          ✓ Accepted ({bookings.filter(b => b.status === 'accepted').length})
        </button>
        <button className={filter === 'in_progress' ? 'active' : ''} onClick={() => setFilter('in_progress')}>
          🔄 In Progress ({bookings.filter(b => b.status === 'in_progress').length})
        </button>
        <button className={filter === 'completed' ? 'active' : ''} onClick={() => setFilter('completed')}>
          ✅ Completed ({bookings.filter(b => b.status === 'completed').length})
        </button>
        <button className={filter === 'cancelled' ? 'active' : ''} onClick={() => setFilter('cancelled')}>
          ❌ Cancelled ({bookings.filter(b => b.status === 'cancelled').length})
        </button>
      </div>

      <div className="bookings-table-container">
        {filteredBookings.length > 0 ? (
        <table className="bookings-table">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Service</th>
              <th>Customer</th>
              <th>Tasker</th>
              <th>Schedule</th>
              <th>Price</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map(booking => (
              <tr key={booking._id}>
                <td>
                  <span className="booking-id">#{booking._id.slice(-6)}</span>
                </td>
                <td>
                  <strong>{booking.service_name || 'N/A'}</strong>
                </td>
                <td>{booking.customer_name || 'N/A'}</td>
                <td>{booking.tasker_name || 'N/A'}</td>
                <td>
                  <div className="schedule-cell">
                    <span className="date">
                      {booking.scheduled_date ? new Date(booking.scheduled_date).toLocaleDateString() : 'N/A'}
                    </span>
                    <span className="time">{booking.scheduled_time || 'N/A'}</span>
                  </div>
                </td>
                <td>
                  <span className="price">₹{booking.total_price?.toLocaleString() || 0}</span>
                </td>
                <td>
                  <span style={{ 
                    backgroundColor: getStatusColor(booking.status),
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    display: 'inline-block'
                  }}>
                    {booking.status ? `${getStatusIcon(booking.status)} ${booking.status.toUpperCase()}` : 'N/A'}
                  </span>
                </td>
                <td>{new Date(booking.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        ) : (
          <div className="empty-state">
            <p>No bookings found</p>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
