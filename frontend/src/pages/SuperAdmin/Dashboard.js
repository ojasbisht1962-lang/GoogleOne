import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import config from '../../config';
// import LoadingSpinner from '../../components/LoadingSpinner';
import LoadingScreen from '../../components/LoadingScreen';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTaskers: 0,
    totalCustomers: 0,
    totalBookings: 0,
    pendingVerifications: 0,
    activeAMCs: 0,
    totalRevenue: 0,
    pendingAMCs: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);

  const quickActions = [
    {
      title: 'User Management',
      description: 'Manage all users',
      icon: '👥',
      color: '#667eea',
      path: '/admin/users'
    },
    {
      title: 'Verifications',
      description: 'Review pending verifications',
      icon: '✓',
      color: '#10b981',
      path: '/admin/verifications',
      badge: stats.pendingVerifications
    },
    {
      title: 'AMC Requests',
      description: 'Manage AMC contracts',
      icon: '📋',
      color: '#f59e0b',
      path: '/admin/amc',
      badge: stats.pendingAMCs
    },
    {
      title: 'All Bookings',
      description: 'View all bookings',
      icon: '📅',
      color: '#8b5cf6',
      path: '/admin/bookings'
    },
    {
      title: 'Price Ranges',
      description: 'Set service pricing',
      icon: '💰',
      color: '#06b6d4',
      path: '/admin/price-ranges'
    },
    {
      title: 'Contact Messages',
      description: 'View messages from contact form',
      icon: '✉️',
      color: '#ea580c',
      path: '/admin/contact-messages'
    },
    {
      title: 'Badge Management',
      description: 'Review badge applications',
      icon: '🏆',
      color: '#d946ef',
      path: '/admin/badges'
    },
    {
      title: 'Support Tickets',
      description: 'Manage support & complaints',
      icon: '🎧',
      color: '#f43f5e',
      path: '/admin/support-tickets'
    }
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      // Fetch all required data
      const [usersRes, bookingsRes, amcRes] = await Promise.all([
        fetch(`${config.API_BASE_URL}/admin/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${config.API_BASE_URL}/admin/bookings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${config.API_BASE_URL}/amc/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

        if (!usersRes.ok || !bookingsRes.ok || !amcRes.ok) {
          if (usersRes.status === 401 || bookingsRes.status === 401 || amcRes.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return;
          }
          throw new Error('Failed to fetch dashboard data');
        }

        // Extract bookings array (might be wrapped in object)
        const users = await usersRes.json();
        const bookingsData = await bookingsRes.json();
        const amcs = await amcRes.json();
        const bookings = Array.isArray(bookingsData) ? bookingsData : (bookingsData.bookings || []);

        // Calculate stats
        const usersArray = Array.isArray(users) ? users : (users.users || []);
        const taskers = usersArray.filter(u => u.role === 'tasker');
        const customers = usersArray.filter(u => u.role === 'customer');
        const pendingVerifications = taskers.filter(t => t.verification_status === 'pending').length;
        const amcsArray = Array.isArray(amcs) ? amcs : [];
        const activeAMCs = amcsArray.filter(a => a.status === 'active').length;
        const pendingAMCs = amcsArray.filter(a => a.status === 'pending').length;
        // Calculate total revenue
        const completedBookings = bookings.filter(b => b.status === 'completed');
        const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);

        setStats({
          totalUsers: usersArray.length,
          totalTaskers: taskers.length,
          totalCustomers: customers.length,
          totalBookings: bookings.length,
          pendingVerifications,
          activeAMCs,
          totalRevenue,
          pendingAMCs
        });

        // Create recent activities
        const activities = [];
        // Recent bookings
        bookings.slice(0, 3).forEach(booking => {
          activities.push({
            type: 'booking',
            message: `New booking created - ${booking.service_name || 'Service'}`,
            time: booking.created_at,
            icon: '📅'
          });
        });
        // Recent AMCs
        amcsArray.slice(0, 2).forEach(amc => {
          activities.push({
            type: 'amc',
            message: `AMC request from ${amc.company_name}`,
            time: amc.created_at,
            icon: '📝'
          });
        });
        // Sort by time
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));
        setRecentActivities(activities.slice(0, 5));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

  if (loading) {
    return (
      <>
  <LoadingScreen />
      </>
    );
  }

  return (
    <div className="admin-dashboard">
      
      {/* Header */}
      <div className="admin-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🛡️ SuperAdmin Dashboard</h1>
            <p>Welcome back, {user?.name}!</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div className="stat-icon">👥</div>
          <div className="stat-details">
            <h3>{stats.totalUsers}</h3>
            <p>Total Users</p>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
          <div className="stat-icon">🔧</div>
          <div className="stat-details">
            <h3>{stats.totalTaskers}</h3>
            <p>Total Taskers</p>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
          <div className="stat-icon">👤</div>
          <div className="stat-details">
            <h3>{stats.totalCustomers}</h3>
            <p>Total Customers</p>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
          <div className="stat-icon">📅</div>
          <div className="stat-details">
            <h3>{stats.totalBookings}</h3>
            <p>Total Bookings</p>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
          <div className="stat-icon">⏳</div>
          <div className="stat-details">
            <h3>{stats.pendingVerifications}</h3>
            <p>Pending Verifications</p>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' }}>
          <div className="stat-icon">📋</div>
          <div className="stat-details">
            <h3>{stats.activeAMCs}</h3>
            <p>Active AMCs</p>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }}>
          <div className="stat-icon">📝</div>
          <div className="stat-details">
            <h3>{stats.pendingAMCs}</h3>
            <p>Pending AMCs</p>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)' }}>
          <div className="stat-icon">💰</div>
          <div className="stat-details">
            <h3>₹{stats.totalRevenue.toLocaleString()}</h3>
            <p>Total Revenue</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="section">
        <h2 className="section-title">⚡ Quick Actions</h2>
        <div className="quick-actions-table-container">
          <table className="quick-actions-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Description</th>
                <th>Status</th>
                <th>Go To</th>
              </tr>
            </thead>
            <tbody>
              {quickActions.map((action, index) => (
                <tr key={index} className="action-row">
                  <td>
                    <div className="action-cell">
                      <span className="action-icon-sm" style={{ color: action.color }}>
                        {action.icon}
                      </span>
                      <span className="action-title">{action.title}</span>
                    </div>
                  </td>
                  <td className="description-cell">{action.description}</td>
                  <td className="status-cell">
                    {action.badge > 0 ? (
                      <span className="status-badge pending">{action.badge} Pending</span>
                    ) : (
                      <span className="status-badge active">Active</span>
                    )}
                  </td>
                  <td className="action-cell-btn">
                    <button
                      className="action-btn"
                      onClick={() => navigate(action.path)}
                      style={{ borderColor: action.color, color: action.color }}
                    >
                      Open →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="section">
        <h2 className="section-title">📊 Recent Activities</h2>
        <div className="activities-container">
          {recentActivities.length === 0 ? (
            <div className="no-activities">
              <p>No recent activities</p>
            </div>
          ) : (
            <div className="activities-list">
              {recentActivities.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">{activity.icon}</div>
                  <div className="activity-content">
                    <p className="activity-message">{activity.message}</p>
                    <span className="activity-time">
                      {new Date(activity.time).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
