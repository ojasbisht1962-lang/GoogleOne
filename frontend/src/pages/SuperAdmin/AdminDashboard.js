import React, { useState, useEffect } from 'react';
import { adminAnalyticsService } from '../../services/adminService';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { Line, Pie } from 'react-chartjs-2';
import UserManagement from './UserManagement';
import BookingManagement from './BookingManagement';
import PriceRangeManagement from './PriceRangeManagement';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import './AdminDashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [revenueTrends, setRevenueTrends] = useState(null);
  const [bookingDistribution, setBookingDistribution] = useState({ distribution: [] });
  const [topTaskers, setTopTaskers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Support tickets states
  const [supportTab, setSupportTab] = useState('all');
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [supportStatistics, setSupportStatistics] = useState(null);
  const [supportLoading, setSupportLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [reviewResult, setReviewResult] = useState('refund_full');
  const [reviewNotes, setReviewNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState('');

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'support') {
      fetchSupportStatistics();
      fetchTickets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, supportTab]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      const [statsData, trendsData, distributionData, taskersData] = await Promise.all([
        adminAnalyticsService.getDashboardStats(),
        adminAnalyticsService.getRevenueTrends('month'),
        adminAnalyticsService.getBookingDistribution(),
        adminAnalyticsService.getTopTaskers(5),
      ]);


      // Transform the data to ensure consistency - handle BOTH old and new structure
      const transformedStats = {
        overview: {
          total_revenue: statsData?.overview?.total_revenue || statsData?.revenue?.total || 0,
          total_users: statsData?.overview?.total_users || statsData?.users?.total || 0,
          total_customers: statsData?.overview?.total_customers || statsData?.users?.customers || 0,
          total_taskers: statsData?.overview?.total_taskers || statsData?.users?.taskers || 0,
          total_bookings: statsData?.overview?.total_bookings || statsData?.bookings?.total || 0,
          completed_bookings: statsData?.overview?.completed_bookings || statsData?.bookings?.completed || 0,
          platform_commission: statsData?.overview?.platform_commission || (statsData?.revenue?.total || 0) * 0.1,
        },
        this_month: {
          bookings: statsData?.this_month?.bookings || 0,
          revenue: statsData?.this_month?.revenue || 0,
          commission: statsData?.this_month?.commission || 0,
        }
      };


      setStats(transformedStats);
      setRevenueTrends(trendsData);
      setBookingDistribution(distributionData || { distribution: [] });
      setTopTaskers(taskersData?.top_taskers || []);

      toast.success('✅ Dashboard data loaded successfully!', { autoClose: 2000 });
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      console.error('❌ Error details:', error.response?.data);
      toast.error(`Failed to load dashboard: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Support ticket functions
  const fetchSupportStatistics = async () => {
    try {
      const response = await api.get('/support/admin/statistics');
      setSupportStatistics(response.data.statistics);
    } catch (error) {
      console.error('Error fetching support statistics:', error);
    }
  };

  const fetchTickets = async () => {
    setSupportLoading(true);
    try {
      const params = new URLSearchParams();

      const response = await api.get(`/support/admin/tickets/all?${params}`);
      let ticketsList = response.data.tickets || [];

      if (supportTab === 'critical') {
        ticketsList = ticketsList.filter(t => t.priority === 'critical');
      }
      if (supportTab === 'complaints') {
        ticketsList = ticketsList.filter(t => t.is_complaint === true);
      }

      setTickets(ticketsList);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setSupportLoading(false);
    }
  };

  const fetchTicketDetails = async (ticketId) => {
    setSupportLoading(true);
    try {
      const [ticketRes, messagesRes] = await Promise.all([
        api.get(`/support/tickets/${ticketId}`),
        api.get(`/support/tickets/${ticketId}/messages`)
      ]);

      setSelectedTicket(ticketRes.data.ticket);
      setTicketMessages(messagesRes.data.messages || []);
      setResolutionNotes(ticketRes.data.ticket.resolution_notes || '');
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      toast.error('Failed to load ticket details');
    } finally {
      setSupportLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedTicket || !selectedTicket._id) {
      toast.error('No ticket selected');
      console.error('handleUpdateStatus: selectedTicket or _id is missing', selectedTicket);
      return;
    }

    try {
      const updateData = { status: newStatus };
      if (newStatus === 'resolved' && resolutionNotes.trim()) {
        updateData.resolution_notes = resolutionNotes;
      }

      await api.put(`/support/admin/tickets/${selectedTicket._id}/update`, updateData);
      toast.success('Ticket status updated!');
      fetchTicketDetails(selectedTicket._id);
      fetchTickets();
      fetchSupportStatistics();
    } catch (error) {
      console.error('Error updating status:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(error.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleAssignToMe = async () => {
    if (!selectedTicket || !selectedTicket._id) {
      toast.error('No ticket selected');
      console.error('handleAssignToMe: selectedTicket or _id is missing', selectedTicket);
      return;
    }

    try {
      await api.put(`/support/admin/tickets/${selectedTicket._id}/update`, {
        assigned_to: 'current_admin_id'
      });
      toast.success('Ticket assigned to you!');
      fetchTicketDetails(selectedTicket._id);
      fetchTickets();
    } catch (error) {
      console.error('Error assigning ticket:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(error.response?.data?.detail || 'Failed to assign ticket');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    try {
      await api.post('/support/tickets/add-message', {
        ticket_id: selectedTicket._id,
        message: messageText
      });

      setMessageText('');
      fetchTicketDetails(selectedTicket._id);
      toast.success('Message sent!');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleTriggerAIReview = async () => {
    if (!selectedTicket?.is_complaint) return;
    
    setSupportLoading(true);
    try {
      await api.post(`/support/complaints/${selectedTicket._id}/ai-review`);
      toast.success('AI review completed! Check the results below.');
      fetchTicketDetails(selectedTicket._id);
    } catch (error) {
      console.error('Error triggering AI review:', error);
      toast.error('Failed to trigger AI review');
    } finally {
      setSupportLoading(false);
    }
  };

  const handleSubmitAdminReview = async (e) => {
    e.preventDefault();
    
    if (!selectedTicket?.is_complaint) return;
    if (!reviewNotes.trim()) {
      toast.error('Please add review notes');
      return;
    }

    setSupportLoading(true);
    try {
      const payload = {
        ticket_id: selectedTicket._id,
        review_result: reviewResult,
        review_notes: reviewNotes,
        refund_amount: refundAmount ? parseFloat(refundAmount) : null,
        penalty_amount: penaltyAmount ? parseFloat(penaltyAmount) : null
      };

      await api.post(`/support/complaints/${selectedTicket._id}/admin-review`, payload);
      
      toast.success('✅ Complaint resolved! Escrow has been unfrozen.');
      setReviewNotes('');
      setRefundAmount('');
      setPenaltyAmount('');
      fetchTicketDetails(selectedTicket._id);
      fetchTickets();
      fetchSupportStatistics();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setSupportLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#00E676',
      medium: '#FDB913',
      high: '#FF9800',
      critical: '#F44336'
    };
    return colors[priority] || colors.low;
  };

  const getPriorityIcon = (priority) => {
    const icons = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    };
    return icons[priority] || '🟢';
  };

  if (loading) {
    return (
      <>
        <div className="admin-dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Revenue trends chart data
  const revenueChartData = {
    labels: revenueTrends?.data?.map(d => d.date) || [],
    datasets: [
      {
        label: 'Total Revenue',
        data: revenueTrends?.data?.map(d => d.revenue) || [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Platform Commission',
        data: revenueTrends?.data?.map(d => d.commission) || [],
        borderColor: 'rgb(255, 206, 86)',
        backgroundColor: 'rgba(255, 206, 86, 0.2)',
        tension: 0.4,
      },
    ],
  };

  // Booking distribution pie chart
  const bookingPieData = {
    labels: Array.isArray(bookingDistribution?.distribution) 
      ? bookingDistribution.distribution.map(d => d.status) 
      : [],
    datasets: [
      {
        data: Array.isArray(bookingDistribution?.distribution) 
          ? bookingDistribution.distribution.map(d => d.count) 
          : [],
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Pie chart options with labels
  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
      datalabels: {
        color: '#fff',
        font: {
          weight: 'bold',
          size: 14,
        },
        formatter: (value, context) => {
          const total = context.dataset.data.reduce((a, b) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return `${value}\n${percentage}%`;
        }
      }
    }
  };

  return (
    <>      <div className="admin-dashboard-container">
        <div className="admin-header">
          <div>
            <h1>🎯 Admin Command Center</h1>
            <p className="admin-subtitle">Comprehensive Platform Management Dashboard</p>
          </div>
          <button 
            className="refresh-button"
            onClick={fetchAllData}
            disabled={loading}
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh Data'}
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Users
          </button>
          <button
            className={`admin-tab ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            📅 Bookings
          </button>
          <button
            className={`admin-tab ${activeTab === 'price-range' ? 'active' : ''}`}
            onClick={() => setActiveTab('price-range')}
          >
            💰 Price Range
          </button>
          <button
            className={`admin-tab ${activeTab === 'support' ? 'active' : ''}`}
            onClick={() => setActiveTab('support')}
          >
            🎧 Support
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-content">
            {/* Key Metrics Cards */}
            <div className="metrics-grid">
              <div key="metric-revenue" className="metric-card revenue">
                <div className="metric-icon">💰</div>
                <div className="metric-details">
                  <h3>Total Revenue</h3>
                  <p className="metric-value">{formatCurrency(stats?.overview?.total_revenue || 0)}</p>
                  <span className="metric-subtitle">Platform Commission: {formatCurrency(stats?.overview?.platform_commission || 0)}</span>
                </div>
              </div>

              <div key="metric-users" className="metric-card users">
                <div className="metric-icon">👥</div>
                <div className="metric-details">
                  <h3>Total Users</h3>
                  <p className="metric-value">{stats?.overview?.total_users || 0}</p>
                  <span className="metric-subtitle">
                    Customers: {stats?.overview?.total_customers || 0} | Taskers: {stats?.overview?.total_taskers || 0}
                  </span>
                </div>
              </div>

              <div key="metric-bookings" className="metric-card bookings">
                <div className="metric-icon">📅</div>
                <div className="metric-details">
                  <h3>Total Bookings</h3>
                  <p className="metric-value">{stats?.overview?.total_bookings || 0}</p>
                  <span className="metric-subtitle">
                    Completed: {stats?.overview?.completed_bookings || 0}
                  </span>
                </div>
              </div>

              <div key="metric-avg-order" className="metric-card avg-order">
                <div className="metric-icon">📈</div>
                <div className="metric-details">
                  <h3>Avg Order Value</h3>
                  <p className="metric-value">{formatCurrency(stats?.overview?.completed_bookings > 0 ? stats.overview.total_revenue / stats.overview.completed_bookings : 0)}</p>
                  <span className="metric-subtitle">Per completed booking</span>
                </div>
              </div>
            </div>

            {/* This Month Stats */}
            <div className="section-card">
              <h2>📅 This Month's Performance</h2>
              <div className="monthly-stats">
                <div key="monthly-bookings" className="monthly-stat">
                  <span className="stat-label">New Bookings</span>
                  <span className="stat-value">{stats?.this_month?.bookings || 0}</span>
                </div>
                <div key="monthly-revenue" className="monthly-stat">
                  <span className="stat-label">Revenue</span>
                  <span className="stat-value">{formatCurrency(stats?.this_month?.revenue || 0)}</span>
                </div>
                <div key="monthly-commission" className="monthly-stat">
                  <span className="stat-label">Commission Earned</span>
                  <span className="stat-value">{formatCurrency(stats?.this_month?.commission || 0)}</span>
                </div>
              </div>
            </div>

            {/* Pending Actions */}
            {(stats?.pending_actions?.verifications > 0 ||
              stats?.pending_actions?.badge_applications > 0 ||
              stats?.pending_actions?.open_complaints > 0) && (
              <div className="section-card alert-card">
                <h2>⚠️ Pending Actions</h2>
                <div className="pending-actions">
                  {stats?.pending_actions?.verifications > 0 && (
                    <div key="verifications" className="pending-item">
                      <span className="pending-icon">✓</span>
                      <span>{stats.pending_actions.verifications} Tasker Verifications Pending</span>
                    </div>
                  )}
                  {stats?.pending_actions?.badge_applications > 0 && (
                    <div key="badge_applications" className="pending-item">
                      <span className="pending-icon">🏆</span>
                      <span>{stats.pending_actions.badge_applications} Badge Applications Pending</span>
                    </div>
                  )}
                  {stats?.pending_actions?.open_complaints > 0 && (
                    <div key="open_complaints" className="pending-item">
                      <span className="pending-icon">🎧</span>
                      <span>{stats.pending_actions.open_complaints} Open Support Tickets</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Charts Section */}
            <div className="charts-grid">
              <div key="chart-revenue" className="chart-card">
                <h2>📈 Revenue Trends (Last 30 Days)</h2>
                <div className="chart-container">
                  <Line data={revenueChartData} options={{ responsive: true, maintainAspectRatio: true }} />
                </div>
              </div>

              <div key="chart-booking-status" className="chart-card">
                <h2>🎯 Booking Status Distribution</h2>
                <div className="chart-container pie-chart">
                  <Pie data={bookingPieData} options={pieChartOptions} />
                </div>
              </div>
            </div>

            {/* Top Performing Taskers */}
            <div className="section-card">
              <h2>⭐ Top Performing Taskers</h2>
              <div className="top-taskers-list">
                {topTaskers.map((tasker, index) => (
                  <div key={tasker.tasker_id || `tasker-${index}`} className="tasker-card">
                    <div className="tasker-rank">#{index + 1}</div>
                    <div className="tasker-info">
                      <h3>{tasker.name}</h3>
                      <p className="tasker-email">{tasker.email}</p>
                    </div>
                    <div className="tasker-stats">
                      <div className="stat">
                        <span className="stat-label">Revenue</span>
                        <span className="stat-value">{formatCurrency(tasker.total_revenue)}</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Bookings</span>
                        <span className="stat-value">{tasker.total_bookings}</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Rating</span>
                        <span className="stat-value">⭐ {tasker.avg_rating?.toFixed(1) || 'N/A'}</span>
                      </div>
                    </div>
                    {tasker.badges && tasker.badges.length > 0 && (
                      <div className="tasker-badges">
                        {tasker.badges.map((badge, badgeIndex) => (
                          <span key={`${tasker.tasker_id}-${badge}-${badgeIndex}`} className={`badge ${badge}`}>
                            {badge === 'gold' && '🥇'}
                            {badge === 'silver' && '🥈'}
                            {badge === 'bronze' && '🥉'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="users-content">
            <UserManagement />
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="bookings-content">
            <BookingManagement />
          </div>
        )}

        {/* Price Range Tab */}
        {activeTab === 'price-range' && (
          <div className="price-range-content">
            <PriceRangeManagement />
          </div>
        )}

        {/* Support Tab */}
        {activeTab === 'support' && (
          <div className="support-content">
            <div className="support-admin-section">
              <h2 style={{color: '#d4af37', marginBottom: '20px'}}>🎧 Support Tickets Management</h2>

              {/* Statistics Dashboard */}
              {supportStatistics ? (
                <div className="stats-grid" style={{marginBottom: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px'}}>
                  {[
                    { icon: '📊', value: supportStatistics.total_tickets, label: 'Total', color: '#d4af37' },
                    { icon: '📂', value: supportStatistics.open_tickets, label: 'Open', color: '#2196F3' },
                    { icon: '⏳', value: supportStatistics.in_progress, label: 'In Progress', color: '#FDB913' },
                    { icon: '✅', value: supportStatistics.resolved_tickets, label: 'Resolved', color: '#00E676' },
                    { icon: '', value: supportStatistics.critical_priority, label: 'Critical', color: '#F44336' },
                    { icon: '⚠️', value: supportStatistics.auto_escalated, label: 'Escalated', color: '#FF9800' }
                  ].map((stat, idx) => (
                    <div key={idx} className="stat-card" style={{background: '#1a1a1a', padding: '20px', borderRadius: '12px', textAlign: 'center'}}>
                      <div style={{fontSize: '2rem'}}>{stat.icon}</div>
                      <div style={{fontSize: '2rem', fontWeight: '700', color: stat.color}}>{stat.value}</div>
                      <div style={{fontSize: '0.9rem', color: '#999'}}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{textAlign: 'center', padding: '20px', color: '#999', background: '#1a1a1a', borderRadius: '12px', marginBottom: '20px'}}>
                  ⏳ Loading statistics...
                </div>
              )}

              {/* Filter Tabs */}
              <div style={{display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap'}}>
                {['all', 'critical', 'complaints'].map(tab => (
                  <button
                    key={tab}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: supportTab === tab ? '2px solid #d4af37' : '2px solid #333',
                      background: supportTab === tab ? '#d4af37' : '#1a1a1a',
                      color: supportTab === tab ? '#000' : '#fff',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                    onClick={() => setSupportTab(tab)}
                  >
                    {tab === 'all' && '📋 All'}
                    {tab === 'critical' && '🚨 Critical'}
                    {tab === 'complaints' && '⚠️ Complaints'}
                  </button>
                ))}
              </div>

              {/* Tickets Content */}
              <div style={{display: 'grid', gridTemplateColumns: selectedTicket ? '400px 1fr' : '1fr', gap: '20px', minHeight: '500px'}}>
                {/* Tickets List */}
                <div style={{background: '#1a1a1a', borderRadius: '12px', padding: '20px', maxHeight: '700px', overflowY: 'auto'}}>
                  {supportLoading && !selectedTicket ? (
                    <div style={{textAlign: 'center', padding: '40px', color: '#999'}}>⏳ Loading...</div>
                  ) : tickets.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '40px', color: '#999'}}>No tickets found</div>
                  ) : (
                    tickets.map(ticket => (
                      <div
                        key={ticket._id}
                        style={{
                          background: selectedTicket?._id === ticket._id ? '#2a2a2a' : '#0f0f0f',
                          borderLeft: `4px solid ${getPriorityColor(ticket.priority)}`,
                          borderRadius: '8px',
                          padding: '15px',
                          marginBottom: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.3s'
                        }}
                        onClick={() => fetchTicketDetails(ticket._id)}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#2a2a2a'}
                        onMouseLeave={(e) => {
                          if (selectedTicket?._id !== ticket._id) {
                            e.currentTarget.style.background = '#0f0f0f';
                          }
                        }}
                      >
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                          <div>
                            <span style={{color: '#d4af37', fontWeight: '700', fontSize: '0.9rem'}}>{ticket.ticket_number}</span>
                            <span style={{marginLeft: '8px', fontSize: '1.2rem'}}>{ticket.tier === 'ai' ? '🤖' : '👤'}</span>
                          </div>
                          <span style={{
                            background: getPriorityColor(ticket.priority),
                            color: '#fff',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            {getPriorityIcon(ticket.priority)} {ticket.priority.toUpperCase()}
                          </span>
                        </div>
                        <h4 style={{color: '#fff', margin: '8px 0', fontSize: '1rem'}}>{ticket.subject}</h4>
                        <p style={{color: '#999', fontSize: '0.85rem', margin: '8px 0', lineHeight: '1.4'}}>{ticket.description.substring(0, 80)}...</p>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px'}}>
                          <span style={{
                            background: ticket.status === 'open' ? '#2196F3' :
                                       ticket.status === 'in_progress' ? '#FDB913' :
                                       ticket.status === 'resolved' ? '#00E676' : '#666',
                            color: '#fff',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem'
                          }}>
                            {ticket.status.replace('_', ' ')}
                          </span>
                          <span style={{color: '#666', fontSize: '0.8rem'}}>
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {ticket.is_complaint && (
                          <div style={{marginTop: '8px', background: '#f4433620', color: '#f44336', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600'}}>
                            ⚠️ COMPLAINT
                          </div>
                        )}
                        {ticket.escrow_frozen && (
                          <div style={{marginTop: '8px', background: '#ff980020', color: '#ff9800', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600'}}>
                            🔒 Escrow Frozen
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Ticket Detail Panel - Only show if ticket selected */}
                {selectedTicket && (
                  <div style={{background: '#1a1a1a', borderRadius: '12px', padding: '25px', maxHeight: '700px', overflowY: 'auto'}}>
                    <div style={{marginBottom: '20px', paddingBottom: '15px', borderBottom: '2px solid #333'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                        <div>
                          <h2 style={{color: '#d4af37', margin: '0 0 8px 0', fontSize: '1.5rem'}}>{selectedTicket.ticket_number}</h2>
                          <h3 style={{color: '#fff', margin: 0, fontSize: '1.2rem'}}>{selectedTicket.subject}</h3>
                        </div>
                        <button 
                          onClick={() => setSelectedTicket(null)}
                          style={{
                            background: '#333',
                            border: 'none',
                            color: '#fff',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          ✖ Close
                        </button>
                      </div>
                    </div>

                    <div style={{background: '#0f0f0f', padding: '15px', borderRadius: '8px', marginBottom: '20px'}}>
                      <div style={{marginBottom: '10px', color: '#ccc'}}><strong style={{color: '#d4af37'}}>User:</strong> {selectedTicket.user_name} ({selectedTicket.user_email})</div>
                      <div style={{marginBottom: '10px', color: '#ccc'}}><strong style={{color: '#d4af37'}}>Category:</strong> {selectedTicket.category.replace('_', ' ')}</div>
                      <div style={{marginBottom: '10px', color: '#ccc'}}><strong style={{color: '#d4af37'}}>Created:</strong> {new Date(selectedTicket.created_at).toLocaleString()}</div>
                      <div style={{color: '#ccc'}}><strong style={{color: '#d4af37'}}>Description:</strong> {selectedTicket.description}</div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap'}}>
                      <button onClick={handleAssignToMe} style={{padding: '10px 20px', background: '#2196F3', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'}}>👤 Assign</button>
                      <button onClick={() => handleUpdateStatus('in_progress')} style={{padding: '10px 20px', background: '#FDB913', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'}}>⏳ In Progress</button>
                      <button onClick={() => handleUpdateStatus('resolved')} style={{padding: '10px 20px', background: '#00E676', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'}}>✅ Resolve</button>
                    </div>

                    {/* Messages */}
                    <div style={{marginBottom: '20px'}}>
                      <h4 style={{color: '#d4af37', marginBottom: '15px'}}>💬 Conversation</h4>
                      {selectedTicket.is_anonymous && (
                        <div style={{background: '#2a1a0a', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #FDB913'}}>
                          <p style={{color: '#FDB913', margin: 0}}>
                            ⚠️ <strong>Anonymous Submission:</strong> This ticket was submitted by a non-logged in user. 
                            They cannot view or respond to messages. You may need to contact them via email: <strong>{selectedTicket.user_email}</strong>
                          </p>
                        </div>
                      )}
                      <div style={{background: '#0f0f0f', borderRadius: '8px', padding: '15px', maxHeight: '300px', overflowY: 'auto', marginBottom: '15px'}}>
                        {ticketMessages.length === 0 ? (
                          <p style={{color: '#666', textAlign: 'center', padding: '20px'}}>No messages yet</p>
                        ) : (
                          ticketMessages.map(msg => (
                            <div key={msg._id} style={{marginBottom: '15px', padding: '12px', background: '#1a1a1a', borderRadius: '8px'}}>
                              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                                <strong style={{color: '#d4af37'}}>
                                  {msg.sender_type === 'agent' && '👤 '}
                                  {msg.sender_type === 'ai' && '🤖 '}
                                  {msg.sender_name}
                                </strong>
                                <span style={{color: '#666', fontSize: '0.85rem'}}>{new Date(msg.created_at).toLocaleString()}</span>
                              </div>
                              <p style={{color: '#ccc', margin: 0}}>{msg.message}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {!selectedTicket.is_anonymous && (
                        <form onSubmit={handleSendMessage} style={{display: 'flex', gap: '10px'}}>
                          <textarea
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            style={{flex: 1, padding: '10px', borderRadius: '8px', background: '#0f0f0f', border: '1px solid #333', color: '#fff', minHeight: '60px'}}
                            placeholder="Type your response..."
                          />
                          <button type="submit" style={{padding: '10px 24px', background: '#d4af37', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700'}}>📤 Send</button>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
